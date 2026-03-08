import { tryit } from 'radash'
import WebSocket from 'ws'

import { TimerManager } from './timer-manager'
import { WsClientEventMap, WsClientEventName } from './ws-events'

import { RestClient } from '../http/rest-client'
import { KTextChannelExtra } from '../types/channel'
import { KEvent } from '../types/event'
import { KEventTypes } from '../types/event-type'
import { KMessage, KMessageKinds } from '../types/message-kind'
import { KSystemEventExtra } from '../types/system-event'
import {
  KHandshakeMessage,
  KResumeAckMessage,
  KWSState,
  KWSStates,
  WsTimingConfig,
  defaultWsTimingConfig,
} from '../types/ws'
import { decompressKMessage } from '../utils/compression'
import { Logger, createLogger } from '../utils/logger'
import { KMessageQueue } from '../utils/message-queue'

/**
 * WsClient 配置
 */
export interface WsClientConfig {
  restClient: RestClient
  compression?: boolean
  autoReconnect?: boolean
  timing?: Partial<WsTimingConfig>
  logger?: Logger
}

/**
 * KOOK WebSocket 客户端
 *
 * 基于有限状态机的 WebSocket 连接管理器。
 *
 * Bug 修复（相比原 KWSHelper）：
 * - #3: Resume 超时竞态 — handleWaitingForPongLastRetry 立即转移状态，超时只在 handleWaitingForResumeOk 中设
 * - #4: Close/Error 重复重连 — 检查当前状态，已在重连流程中则不重复触发
 * - #5: 定时器泄漏 — TimerManager 在 reconnect/disconnect 时 clearAll()
 * - #6: 延迟 setState 竞态 — stateVersion 机制防止过期的延迟 setState 生效
 */
export class WsClient {
  private restClient: RestClient
  private compression: boolean
  private autoReconnect: boolean
  private timing: WsTimingConfig
  private logger: Logger

  private state: KWSState = KWSStates.Idle
  private stateVersion = 0
  private lastSn = 0
  private lastSessionId = ''
  private gatewayUrl = ''
  private webSocket: WebSocket | null = null
  private eventQueue = new KMessageQueue<KEvent<unknown>>()
  private timers = new TimerManager()

  private listeners = new Map<WsClientEventName, Set<(...args: any[]) => void>>()

  constructor(config: WsClientConfig) {
    this.restClient = config.restClient
    this.compression = config.compression ?? true
    this.autoReconnect = config.autoReconnect ?? true
    this.timing = { ...defaultWsTimingConfig, ...config.timing }
    this.logger = config.logger ?? createLogger({ prefix: 'kook-ws' })
  }

  // --- 事件系统 ---

  on<E extends WsClientEventName>(event: E, listener: (...args: WsClientEventMap[E]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
    return this
  }

  off<E extends WsClientEventName>(event: E, listener: (...args: WsClientEventMap[E]) => void): this {
    this.listeners.get(event)?.delete(listener)
    return this
  }

  private emit<E extends WsClientEventName>(event: E, ...args: WsClientEventMap[E]): void {
    const set = this.listeners.get(event)
    if (set) {
      for (const listener of set) {
        try {
          listener(...args)
        } catch (e) {
          this.logger.error('Error in event listener for', event, ':', e)
        }
      }
    }
  }

  // --- 状态管理 ---

  /**
   * 获取当前连接状态
   */
  get currentState(): KWSState {
    return this.state
  }

  /**
   * 更新状态并触发状态机
   *
   * Bug #6 修复：延迟 setState 通过 stateVersion 检查防止竞态
   */
  private setState(newState: KWSState, afterMs?: number): void {
    if (newState === this.state) {
      this.logger.warn('State is already', newState)
      return
    }

    if (afterMs) {
      const capturedVersion = this.stateVersion
      this.timers.setTimeout(() => {
        if (this.stateVersion !== capturedVersion) {
          this.logger.debug('Skipping stale setState', newState, 'version mismatch', capturedVersion, this.stateVersion)
          return
        }
        this.applyState(newState)
      }, afterMs)
    } else {
      this.applyState(newState)
    }
  }

  private applyState(newState: KWSState): void {
    const oldState = this.state
    this.state = newState
    this.stateVersion++
    this.emit('stateChange', newState, oldState)
    this.handleStateUpdated()
  }

  // --- 状态机 ---

  private handleStateUpdated(): void {
    switch (this.state) {
      case KWSStates.OpeningGateway:
        this.handleOpenGateway(false, false)
        break
      case KWSStates.OpeningGateway1stRetry:
        this.handleOpenGateway(true, false)
        break
      case KWSStates.OpeningGatewayLastRetry:
        this.handleOpenGateway(true, true)
        break
      case KWSStates.OpeningGatewayAfterDisconnect:
        this.handleOpenGatewayInfiniteRetry(this.timing.infiniteRetryInitialMs)
        break
      case KWSStates.WaitingForHandshake:
        this.handleWaitingForHandshake()
        break
      case KWSStates.Connected:
        this.handleConnected()
        break
      case KWSStates.WaitingForHeartbeatResponse:
        this.handleWaitingForHeartbeatResponse()
        break
      case KWSStates.WaitingForHeartbeatResponse1stRetry:
        this.handleWaitingForPong1stRetry()
        break
      case KWSStates.WaitingForHeartbeatResponseLastRetry:
        this.handleWaitingForPongLastRetry()
        break
      case KWSStates.WaitingForResumeOk:
        this.handleWaitingForResumeOk()
        break
    }
  }

  // --- 公共方法 ---

  /**
   * 启动 WebSocket 连接
   */
  connect(): void {
    this.setState(KWSStates.OpeningGateway)
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect(): void {
    this.timers.clearAll()
    this.closeWebSocket()
    this.applyState(KWSStates.Idle)
  }

  // --- Gateway 连接 ---

  private async handleOpenGateway(isRetry: boolean, isLastRetry: boolean): Promise<void> {
    const result = await this.restClient.openGateway({
      compress: this.compression,
      fromDisconnect: false,
    })

    if (result.success) {
      this.handleGatewayReady(result.data.url)
      this.setState(KWSStates.WaitingForHandshake)
      return
    }

    if (isLastRetry) {
      this.emit('error', 'Cannot connect to server after retries')
      return
    }

    if (isRetry) {
      this.setState(KWSStates.OpeningGatewayLastRetry, this.timing.gatewayRetryFinalDelayMs)
      return
    }

    this.setState(KWSStates.OpeningGateway1stRetry, this.timing.gatewayRetryDelayMs)
  }

  private async handleOpenGatewayInfiniteRetry(duration: number): Promise<void> {
    this.logger.info('Infinite reconnecting with delay=', duration, 'ms')

    this.timers.setTimeout(async () => {
      const [err, result] = await tryit((props) => this.restClient.openGateway(props))({
        compress: this.compression,
        fromDisconnect: true,
        lastProcessedSn: this.lastSn,
        lastSessionId: this.lastSessionId,
      })

      if (err || !result.success) {
        this.logger.error('Failed to open gateway during infinite retry', err)
        this.handleOpenGatewayInfiniteRetry(Math.min(duration * 2, this.timing.infiniteRetryMaxMs))
        return
      }

      this.handleGatewayReady(result.data.url)
      this.setState(KWSStates.WaitingForHandshake)
    }, duration)
  }

  // --- 握手 ---

  private handleWaitingForHandshake(): void {
    const version = this.stateVersion
    this.timers.setTimeout(() => {
      if (this.state === KWSStates.WaitingForHandshake && this.stateVersion === version) {
        this.setState(KWSStates.OpeningGateway, this.timing.gatewayPostDisconnectDelayMs)
      }
    }, this.timing.handshakeTimeoutMs)
  }

  // --- 心跳 ---

  private handleConnected(): void {
    this.scheduleNextHeartbeat()
  }

  /**
   * 安排下一次心跳
   */
  private scheduleNextHeartbeat(): void {
    const version = this.stateVersion
    this.timers.setTimeout(() => {
      if (this.state === KWSStates.Connected && this.stateVersion === version) {
        this.sendHeartbeatRequest()
        this.applyState(KWSStates.WaitingForHeartbeatResponse)
      }
    }, this.timing.heartbeatIntervalMs)
  }

  private handleWaitingForHeartbeatResponse(): void {
    const version = this.stateVersion
    this.timers.setTimeout(() => {
      if (this.state === KWSStates.WaitingForHeartbeatResponse && this.stateVersion === version) {
        this.setState(KWSStates.WaitingForHeartbeatResponse1stRetry, this.timing.heartbeatRetryDelayMs)
      }
    }, this.timing.heartbeatTimeoutMs)
  }

  private handleWaitingForPong1stRetry(): void {
    this.timers.setTimeout(() => this.sendHeartbeatRequest(), this.timing.repingFirstDelayMs)
    this.timers.setTimeout(() => this.sendHeartbeatRequest(), this.timing.repingFinalDelayMs)

    const timeout = this.timing.repingFirstDelayMs + this.timing.repingFinalDelayMs + this.timing.pongTimeoutMs
    const version = this.stateVersion
    this.timers.setTimeout(() => {
      if (this.state === KWSStates.WaitingForHeartbeatResponse1stRetry && this.stateVersion === version) {
        this.setState(KWSStates.WaitingForHeartbeatResponseLastRetry)
      }
    }, timeout)
  }

  /**
   * Bug #3 修复：立即转移到 WAITING_FOR_RESUME_OK，超时只在 handleWaitingForResumeOk 中设
   */
  private handleWaitingForPongLastRetry(): void {
    this.timers.setTimeout(() => this.sendResumeRequest(), this.timing.resumeFirstDelayMs)
    this.timers.setTimeout(() => this.sendResumeRequest(), this.timing.resumeFinalDelayMs)

    // 立即转移到 WAITING_FOR_RESUME_OK
    this.setState(KWSStates.WaitingForResumeOk)
  }

  private handleWaitingForResumeOk(): void {
    const version = this.stateVersion
    this.timers.setTimeout(() => {
      if (this.state === KWSStates.WaitingForResumeOk && this.stateVersion === version) {
        // Bug #5 修复：清除所有定时器再进入无限重试
        this.timers.clearAll()
        this.closeWebSocket()
        this.setState(KWSStates.OpeningGatewayAfterDisconnect)
      }
    }, this.timing.resumeTimeoutMs)
  }

  // --- 信令发送 ---

  private sendKMessage<T>(message: KMessage<T>): void {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      this.logger.warn('WebSocket is not ready to send message')
      return
    }
    try {
      this.webSocket.send(JSON.stringify(message))
    } catch {
      this.logger.error('Failed to serialize message')
    }
  }

  private sendHeartbeatRequest(): void {
    this.sendKMessage({ s: KMessageKinds.Ping, sn: this.lastSn, d: {} })
  }

  private sendResumeRequest(): void {
    this.sendKMessage({ s: KMessageKinds.Resume, sn: this.lastSn, d: {} })
  }

  private sendResumeAck(): void {
    this.sendKMessage({ s: KMessageKinds.ResumeAck, sn: this.lastSn, d: {} })
  }

  // --- 信令接收 ---

  private dispatchKMessage({ s: messageKind, d: data, sn }: KMessage<unknown>): void {
    switch (messageKind) {
      case KMessageKinds.Event:
        this.handleReceivedEvent(sn, data as KEvent<unknown>)
        break
      case KMessageKinds.Hello:
        this.handleReceivedHandshake((data as KHandshakeMessage).session_id)
        break
      case KMessageKinds.Ping:
        // 服务端发来 Ping，回复 Pong
        this.sendKMessage({ s: KMessageKinds.Pong, d: {} })
        break
      case KMessageKinds.Pong:
        this.handleReceivedPong()
        break
      case KMessageKinds.Reconnect:
        this.handleReceivedReconnect()
        break
      case KMessageKinds.ResumeAck:
        this.handleReceivedResumeAck((data as KResumeAckMessage).session_id)
        break
      case KMessageKinds.Resume:
        this.sendResumeAck()
        break
    }
  }

  private handleReceivedEvent(sn: number | undefined, event: KEvent<unknown>): void {
    const executeEvent = (evt: KEvent<unknown>) => {
      this.emit('event', evt, sn)
      if (evt.type === KEventTypes.System) {
        this.emit('systemEvent', evt as KEvent<KSystemEventExtra>, sn)
      } else {
        this.emit('textChannelEvent', evt as KEvent<KTextChannelExtra>, sn)
      }
    }

    if (!sn) {
      this.logger.info('Processing event without sn')
      executeEvent(event)
      return
    }

    if (sn - this.lastSn > 1) {
      this.logger.warn('Jumped serial number detected', 'lastSn=', this.lastSn, 'sn=', sn)
      this.eventQueue.enqueue(event, sn)

      // 6 秒后强制清空
      this.timers.setTimeout(() => {
        if (!this.eventQueue.isEmpty()) {
          this.logger.info('Time is up! Flushing event queue')
          this.handleClearMessageQueueAndSetLastSn()
        }
      }, 6000)
    } else {
      executeEvent(event)
      this.lastSn = sn

      if (!this.eventQueue.isEmpty() && this.eventQueue.isPriorityStrictAscending(this.lastSn)) {
        this.logger.info('Jumped SN resolved. Clearing queue and processing', this.eventQueue.size(), 'events')
        this.handleClearMessageQueueAndSetLastSn()
      }
    }
  }

  private handleReceivedHandshake(sessionId: string): void {
    this.logger.info('Server handshake success')
    this.lastSessionId = sessionId
    if (this.state === KWSStates.WaitingForHandshake) {
      this.setState(KWSStates.Connected)
    }
  }

  private handleReceivedPong(): void {
    if (
      this.state === KWSStates.WaitingForHeartbeatResponse ||
      this.state === KWSStates.WaitingForHeartbeatResponse1stRetry
    ) {
      this.setState(KWSStates.Connected)
    }
  }

  /**
   * 任何时候收到 reconnect 包，必须清空所有状态，从头开始
   */
  private handleReceivedReconnect(): void {
    // Bug #5 修复：清除所有定时器
    this.timers.clearAll()
    this.closeWebSocket()
    this.lastSn = 0
    this.lastSessionId = ''
    this.gatewayUrl = ''
    this.eventQueue.clear()
    this.emit('reset')
    this.setState(KWSStates.OpeningGateway)
  }

  private handleReceivedResumeAck(sessionId: string): void {
    this.logger.info('Server acked resume')
    this.lastSessionId = sessionId
    if (this.state === KWSStates.WaitingForResumeOk) {
      this.setState(KWSStates.Connected)
    }
  }

  // --- WebSocket 生命周期 ---

  private handleGatewayReady(gatewayUrl: string): void {
    this.closeWebSocket()
    this.gatewayUrl = gatewayUrl

    const ws = new WebSocket(this.gatewayUrl)
    ws.onopen = this.onWebSocketOpen.bind(this)
    ws.onmessage = this.onWebSocketMessage.bind(this)
    ws.onclose = this.onWebSocketClose.bind(this)
    ws.onerror = this.onWebSocketError.bind(this)
    this.webSocket = ws
  }

  private onWebSocketOpen(): void {
    this.emit('open')
  }

  /**
   * Bug #4 修复：检查当前状态，已在重连流程中则不重复触发
   */
  private onWebSocketClose(): void {
    this.emit('close')
    if (this.autoReconnect && this.shouldAttemptReconnect()) {
      this.timers.clearAll()
      this.connect()
    }
  }

  /**
   * Bug #4 修复：检查当前状态，已在重连流程中则不重复触发
   */
  private onWebSocketError(ev: WebSocket.ErrorEvent): void {
    this.logger.error('WebSocket error', ev.message)
    this.emit('error', ev.message || 'WebSocket error')
    if (this.autoReconnect && this.shouldAttemptReconnect()) {
      this.timers.clearAll()
      this.connect()
    }
  }

  /**
   * Bug #4 辅助：判断是否应该尝试重连
   *
   * 如果当前已在 opening gateway 相关状态或 idle 状态，则不应重复触发重连
   */
  private shouldAttemptReconnect(): boolean {
    return (
      this.state !== KWSStates.Idle &&
      this.state !== KWSStates.OpeningGateway &&
      this.state !== KWSStates.OpeningGateway1stRetry &&
      this.state !== KWSStates.OpeningGatewayLastRetry &&
      this.state !== KWSStates.OpeningGatewayAfterDisconnect
    )
  }

  private onWebSocketMessage(ev: WebSocket.MessageEvent): void {
    let message: KMessage<unknown> | null
    try {
      message = this.compression ? decompressKMessage(ev.data as Buffer) : JSON.parse(ev.data as string)
    } catch {
      this.logger.error('Failed to parse message')
      return
    }

    if (!message) {
      this.logger.error('Failed to decompress message')
      return
    }

    this.dispatchKMessage(message)
  }

  private closeWebSocket(): void {
    if (this.webSocket) {
      this.webSocket.onopen = null
      this.webSocket.onmessage = null
      this.webSocket.onclose = null
      this.webSocket.onerror = null
      if (this.webSocket.readyState === WebSocket.OPEN || this.webSocket.readyState === WebSocket.CONNECTING) {
        this.webSocket.close()
      }
      this.webSocket = null
    }
  }

  // --- 消息队列 ---

  private handleClearMessageQueueAndSetLastSn(): void {
    let maxSn = this.lastSn
    while (!this.eventQueue.isEmpty()) {
      const [event, priority] = this.eventQueue.dequeue()!
      maxSn = Math.max(maxSn, priority)
      this.emit('event', event, undefined)
      if (event.type === KEventTypes.System) {
        this.emit('systemEvent', event as KEvent<KSystemEventExtra>, undefined)
      } else {
        this.emit('textChannelEvent', event as KEvent<KTextChannelExtra>, undefined)
      }
    }
    this.eventQueue.clear()
    this.lastSn = maxSn
  }
}
