import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WsClient } from '../src/ws/ws-client'
import { RestClient } from '../src/http/rest-client'
import { KWSStates } from '../src/types/ws'
import { KMessageKinds } from '../src/types/message-kind'
import { KEventTypes } from '../src/types/event-type'

// Mock WebSocket
vi.mock('ws', () => {
  class MockWebSocket {
    static OPEN = 1
    static CONNECTING = 0
    static CLOSING = 2
    static CLOSED = 3

    readyState = MockWebSocket.OPEN
    onopen: any = null
    onmessage: any = null
    onclose: any = null
    onerror: any = null

    sent: string[] = []

    send(data: string) {
      this.sent.push(data)
    }

    close() {
      this.readyState = MockWebSocket.CLOSED
    }

    simulateMessage(data: any) {
      if (this.onmessage) {
        this.onmessage({ data: JSON.stringify(data) })
      }
    }

    simulateOpen() {
      if (this.onopen) {
        this.onopen({})
      }
    }

    simulateClose() {
      if (this.onclose) {
        this.onclose({ code: 1000, reason: 'normal' })
      }
    }
  }

  return { default: MockWebSocket, __esModule: true }
})

function createMockRestClient(gatewaySuccess = true) {
  return {
    openGateway: vi.fn().mockResolvedValue(
      gatewaySuccess
        ? { success: true, code: 0, message: 'ok', data: { url: 'wss://test.kookapp.cn/gateway' } }
        : { success: false, code: 500, message: 'error', data: {} }
    ),
  } as unknown as RestClient
}

function silentLogger() {
  return { debug() {}, info() {}, warn() {}, error() {} }
}

describe('WsClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('State transitions', () => {
    it('should start from IDLE state', () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })
      expect(ws.currentState).toBe(KWSStates.Idle)
    })

    it('should transition IDLE → OPENING_GATEWAY on connect()', () => {
      const rest = createMockRestClient()
      const states: string[] = []

      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })

      ws.on('stateChange', (newState) => {
        states.push(newState)
      })

      ws.connect()
      expect(states[0]).toBe(KWSStates.OpeningGateway)
    })

    it('should transition to WAITING_FOR_HANDSHAKE after successful gateway', async () => {
      const rest = createMockRestClient()
      const states: string[] = []

      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })

      ws.on('stateChange', (newState) => {
        states.push(newState)
      })

      ws.connect()
      // Let the async openGateway resolve
      await vi.advanceTimersByTimeAsync(0)

      expect(states).toContain(KWSStates.WaitingForHandshake)
    })

    it('should retry gateway on failure', async () => {
      const rest = createMockRestClient(false)
      const states: string[] = []

      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })

      ws.on('stateChange', (newState) => {
        states.push(newState)
      })

      ws.connect()
      // Let first attempt fail
      await vi.advanceTimersByTimeAsync(0)

      // Should schedule 1st retry after 2000ms
      vi.advanceTimersByTime(2000)
      await vi.advanceTimersByTimeAsync(0)

      expect(states).toContain(KWSStates.OpeningGateway1stRetry)
    })

    it('should return to IDLE on disconnect()', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      ws.disconnect()
      expect(ws.currentState).toBe(KWSStates.Idle)
    })
  })

  describe('Handshake and Connected', () => {
    it('should transition to CONNECTED after handshake', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      const mockWs = ws['webSocket'] as any
      mockWs.simulateMessage({ s: KMessageKinds.Hello, d: { session_id: 'sess-1' } })

      // handleConnected schedules next heartbeat, state stays CONNECTED
      expect(ws.currentState).toBe(KWSStates.Connected)
    })

    it('should transition to WAITING_FOR_HEARTBEAT_RESPONSE after heartbeat interval', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
        timing: { heartbeatIntervalMs: 5000 },
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      const mockWs = ws['webSocket'] as any
      mockWs.simulateMessage({ s: KMessageKinds.Hello, d: { session_id: 'sess-1' } })
      expect(ws.currentState).toBe(KWSStates.Connected)

      // After heartbeat interval, sends heartbeat and transitions
      vi.advanceTimersByTime(5000)
      expect(ws.currentState).toBe(KWSStates.WaitingForHeartbeatResponse)
    })

    it('should return to CONNECTED after receiving pong', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
        timing: { heartbeatIntervalMs: 5000 },
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      const mockWs = ws['webSocket'] as any
      mockWs.simulateMessage({ s: KMessageKinds.Hello, d: { session_id: 'sess-1' } })

      // After heartbeat interval, moves to WAITING_FOR_HEARTBEAT_RESPONSE
      vi.advanceTimersByTime(5000)
      expect(ws.currentState).toBe(KWSStates.WaitingForHeartbeatResponse)

      // Receive pong
      mockWs.simulateMessage({ s: KMessageKinds.Pong, d: {} })
      expect(ws.currentState).toBe(KWSStates.Connected)
    })

    it('should send another heartbeat after interval when pong received', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
        timing: { heartbeatIntervalMs: 5000 },
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      const mockWs = ws['webSocket'] as any
      mockWs.simulateMessage({ s: KMessageKinds.Hello, d: { session_id: 'sess-1' } })

      // First heartbeat cycle
      vi.advanceTimersByTime(5000)
      expect(ws.currentState).toBe(KWSStates.WaitingForHeartbeatResponse)

      // Pong
      mockWs.simulateMessage({ s: KMessageKinds.Pong, d: {} })
      expect(ws.currentState).toBe(KWSStates.Connected)

      // After another interval, should transition to waiting again
      vi.advanceTimersByTime(5000)
      expect(ws.currentState).toBe(KWSStates.WaitingForHeartbeatResponse)
    })
  })

  describe('Heartbeat timeout and retry', () => {
    it('should move to 1st retry after heartbeat timeout', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
        timing: {
          heartbeatIntervalMs: 1000,
          heartbeatTimeoutMs: 2000,
          heartbeatRetryDelayMs: 500,
        },
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      const mockWs = ws['webSocket'] as any
      mockWs.simulateMessage({ s: KMessageKinds.Hello, d: { session_id: 'sess-1' } })

      // After heartbeat interval, transitions to WAITING
      vi.advanceTimersByTime(1000)
      expect(ws.currentState).toBe(KWSStates.WaitingForHeartbeatResponse)

      // Advance past heartbeat timeout
      vi.advanceTimersByTime(2000)
      // Then the retry delay
      vi.advanceTimersByTime(500)
      expect(ws.currentState).toBe(KWSStates.WaitingForHeartbeatResponse1stRetry)
    })
  })

  describe('Event handling', () => {
    it('should emit textChannelEvent for non-system events', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })

      const textEvents: any[] = []
      ws.on('textChannelEvent', (event) => {
        textEvents.push(event)
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      const mockWs = ws['webSocket'] as any
      mockWs.simulateMessage({ s: KMessageKinds.Hello, d: { session_id: 'sess-1' } })

      mockWs.simulateMessage({
        s: KMessageKinds.Event,
        sn: 1,
        d: {
          channel_type: 'GROUP',
          type: KEventTypes.KMarkdown,
          target_id: 'ch-1',
          author_id: 'user-1',
          content: 'hello',
          msg_id: 'msg-1',
          msg_timestamp: Date.now(),
          nonce: '',
          extra: {
            type: KEventTypes.KMarkdown,
            guild_id: 'guild-1',
            channel_name: 'general',
            mention: [],
            mention_all: false,
            mention_roles: [],
            mention_here: false,
            author: { id: 'user-1', username: 'test' },
          },
        },
      })

      expect(textEvents).toHaveLength(1)
      expect(textEvents[0].content).toBe('hello')
    })

    it('should emit systemEvent for system events', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })

      const systemEvents: any[] = []
      ws.on('systemEvent', (event) => {
        systemEvents.push(event)
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      const mockWs = ws['webSocket'] as any
      mockWs.simulateMessage({ s: KMessageKinds.Hello, d: { session_id: 'sess-1' } })

      mockWs.simulateMessage({
        s: KMessageKinds.Event,
        sn: 1,
        d: {
          channel_type: 'GROUP',
          type: KEventTypes.System,
          target_id: 'guild-1',
          author_id: '1',
          content: '',
          msg_id: 'msg-2',
          msg_timestamp: Date.now(),
          nonce: '',
          extra: { type: 'deleted_message', body: { msg_id: 'msg-x', channel_id: 'ch-1' } },
        },
      })

      expect(systemEvents).toHaveLength(1)
      expect(systemEvents[0].extra.type).toBe('deleted_message')
    })
  })

  describe('Reconnect (Bug #4 fix)', () => {
    it('should not duplicate reconnect when already in gateway opening state', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        autoReconnect: true,
        logger: silentLogger(),
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      // shouldAttemptReconnect should return false when already opening
      ;(ws as any).state = KWSStates.OpeningGateway
      expect((ws as any).shouldAttemptReconnect()).toBe(false)

      ;(ws as any).state = KWSStates.OpeningGateway1stRetry
      expect((ws as any).shouldAttemptReconnect()).toBe(false)

      ;(ws as any).state = KWSStates.OpeningGatewayAfterDisconnect
      expect((ws as any).shouldAttemptReconnect()).toBe(false)

      // Should return true for connected states
      ;(ws as any).state = KWSStates.Connected
      expect((ws as any).shouldAttemptReconnect()).toBe(true)

      ;(ws as any).state = KWSStates.WaitingForHandshake
      expect((ws as any).shouldAttemptReconnect()).toBe(true)
    })
  })

  describe('stateVersion (Bug #6 fix)', () => {
    it('should prevent stale delayed setState from executing', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      const mockWs = ws['webSocket'] as any
      mockWs.simulateMessage({ s: KMessageKinds.Hello, d: { session_id: 'sess-1' } })

      // Now in WAITING_FOR_HEARTBEAT_RESPONSE with timers scheduled
      const initialVersion = (ws as any).stateVersion

      // Disconnect clears all timers and increments version
      ws.disconnect()
      expect(ws.currentState).toBe(KWSStates.Idle)
      expect((ws as any).stateVersion).not.toBe(initialVersion)

      // Advance time - old timers should be cleared, no state change
      vi.advanceTimersByTime(60000)
      expect(ws.currentState).toBe(KWSStates.Idle)
    })
  })

  describe('Reconnect packet', () => {
    it('should reset all state on reconnect packet', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })

      let resetEmitted = false
      ws.on('reset', () => {
        resetEmitted = true
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      const mockWs = ws['webSocket'] as any
      mockWs.simulateMessage({ s: KMessageKinds.Hello, d: { session_id: 'sess-1' } })

      ;(ws as any).lastSn = 42
      ;(ws as any).lastSessionId = 'sess-1'

      // Receive reconnect signal
      mockWs.simulateMessage({ s: KMessageKinds.Reconnect, d: {} })

      expect(resetEmitted).toBe(true)
      expect((ws as any).lastSn).toBe(0)
      expect((ws as any).lastSessionId).toBe('')
    })
  })

  describe('Message queue', () => {
    it('should hold and release out-of-order messages', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })

      const events: any[] = []
      ws.on('textChannelEvent', (event) => {
        events.push(event)
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      const mockWs = ws['webSocket'] as any
      mockWs.simulateMessage({ s: KMessageKinds.Hello, d: { session_id: 'sess-1' } })

      function makeTextEvent(content: string, sn: number) {
        return {
          s: KMessageKinds.Event,
          sn,
          d: {
            channel_type: 'GROUP',
            type: KEventTypes.KMarkdown,
            target_id: 'ch-1',
            author_id: 'user-1',
            content,
            msg_id: `msg-${sn}`,
            msg_timestamp: Date.now(),
            nonce: '',
            extra: {
              type: KEventTypes.KMarkdown,
              guild_id: 'guild-1',
              channel_name: 'general',
              mention: [],
              mention_all: false,
              mention_roles: [],
              mention_here: false,
              author: { id: 'user-1', username: 'test' },
            },
          },
        }
      }

      // Send sn=1, then sn=3 (skip sn=2)
      mockWs.simulateMessage(makeTextEvent('first', 1))
      mockWs.simulateMessage(makeTextEvent('third', 3))

      expect(events).toHaveLength(1)
      expect(events[0].content).toBe('first')

      // Now send sn=2 — queue should flush
      mockWs.simulateMessage(makeTextEvent('second', 2))
      expect(events).toHaveLength(3)
    })

    it('should flush queue after 6 seconds timeout', async () => {
      const rest = createMockRestClient()
      const ws = new WsClient({
        restClient: rest,
        compression: false,
        logger: silentLogger(),
      })

      const events: any[] = []
      ws.on('event', (event) => {
        events.push(event)
      })

      ws.connect()
      await vi.advanceTimersByTimeAsync(0)

      const mockWs = ws['webSocket'] as any
      mockWs.simulateMessage({ s: KMessageKinds.Hello, d: { session_id: 'sess-1' } })

      // Send sn=1 then sn=5 (big gap)
      mockWs.simulateMessage({
        s: KMessageKinds.Event,
        sn: 1,
        d: { channel_type: 'GROUP', type: KEventTypes.Text, target_id: 'ch', author_id: 'u', content: 'a', msg_id: 'm1', msg_timestamp: 0, nonce: '', extra: {} },
      })
      mockWs.simulateMessage({
        s: KMessageKinds.Event,
        sn: 5,
        d: { channel_type: 'GROUP', type: KEventTypes.Text, target_id: 'ch', author_id: 'u', content: 'e', msg_id: 'm5', msg_timestamp: 0, nonce: '', extra: {} },
      })

      expect(events).toHaveLength(1)

      // After 6 seconds, queue should flush
      vi.advanceTimersByTime(6000)
      expect(events).toHaveLength(2)
    })
  })
})
