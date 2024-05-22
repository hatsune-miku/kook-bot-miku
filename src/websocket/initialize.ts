import WebSocket from "ws"
import { shared } from "../global/shared"
import { error, info, warn } from "../utils/logging/logger"
import { KEvent, KEventType, KHandshakeMessage, KMessage, KMessageKind, KResumeAckMessage, KSystemEventExtra, KTextChannelExtra, KWebSocketState } from "./types"
import { decompressKMessage } from "../utils/deflate/deflate"
import { Requests } from "../utils/krequest/request"
import { die } from "../utils/server/die"
import { chatCompletionWithoutStream } from "../chat/openai"
import { ContextUnit } from "../chat/types"

const HANDSHAKE_TIMEOUT_MILLIS = 6000
const WAIT_PONGS_TIMEOUT_MILLIS = 6000
const WAIT_RESUME_OK_TIMEOUT_MILLIS = 6000
const HEARTBEAT_WAIT_TIMEOUT_MILLIS = 6000
const REPING1_WAIT_DURATION_MILLIS = 2000
const REPING2_WAIT_DURATION_MILLIS = 4000
const HEARTBEAT_INTERVAL_MILLIS = 30000
const RESUME_REQUEST1_DURATION_MILLIS = 8000
const RESUME_REQUEST2_DURATION_MILLIS = 16000

let pingSenderInterval: NodeJS.Timeout | null = null
let lastSn: number = 0
let lastSessionId: string = ''
const userIdToContext = new Map<string, ContextUnit[]>()

function getContext(userId: string): ContextUnit[] {
    if (!userIdToContext.has(userId)) {
        userIdToContext.set(userId, [])
    }
    return userIdToContext.get(userId)!
}

function appendToContext(userId: string, unit: ContextUnit) {
    const context = getContext(userId)
    context.push(unit)
    if (context.length > 12) {
        context.shift()
    }
}

/**
 * @returns 是否正处于指数回退的等待期？
 */
function isWaitingForRetry(): boolean {
    return shared.webSocketState === KWebSocketState.RETRY_WAITING
}

function setWaitingForRetry(): void {
    setState(KWebSocketState.RETRY_WAITING)
}

/**
 * 更新状态，触发状态机
 */
function setState(state: KWebSocketState, props?: SetStateProps): void {
    if (state === shared.webSocketState) {
        warn('State is already', state)
        return
    }

    props ||= {}
    if (props.afterMillis) {
        setTimeout(() => {
            info('Switched state from', shared.webSocketState, 'to', state)
            shared.webSocketState = state
            handleStateUpdated()
        }, props.afterMillis)
    }
    else {
        info('Switched state from', shared.webSocketState, 'to', state)
        shared.webSocketState = state
        handleStateUpdated()
    }
}

/**
 * 发送信令
 */
function sendKMessage<T>(message: KMessage<T>) {
    const serialized = JSON.stringify(message)
    shared.webSocket?.send(serialized)
}

function sendHeartbeatRequest() {
    sendKMessage({ s: KMessageKind.Ping, sn: lastSn, d: {} })
}

function sendResumeRequest() {
    sendKMessage({ s: KMessageKind.Resume, sn: lastSn, d: {} })
}

/**
 * 1. 获取Gateway
 * 
 * @param fromDisconnect 是否走断线重连逻辑？
 */
async function handleOpenGateway({ isRetry, isLastRetry }: RetryProps) {
    // 连接 Gateway
    const result = await Requests.openGateway({ compress: true, fromDisconnect: false })

    // 如果成功，进入第三步（收hello包）
    if (result.success) {
        const gateway = result.data
        handleGatewayReady(gateway.url)
        setState(KWebSocketState.WAITING_FOR_HANDSHAKE)
        return
    }

    // Gateway的最后一次重试失败了
    if (isLastRetry) {
        die("无法连接到服务器")
        return
    }

    // 第一次重试失败了，4s后重试下一次
    if (isRetry) {
        setWaitingForRetry()
        setState(KWebSocketState.OPENING_GATEWAY_LAST_RETRY, { afterMillis: 4000 })
        return
    }

    // 首次失败，2s后重试
    setWaitingForRetry()
    setState(KWebSocketState.OPENING_GATEWAY_1ST_RETRY, { afterMillis: 2000 })
}

async function handleOpenGatewayInfiniteRetry(duration: number) {
    info("Infinite reconnecting with duration=", duration)

    async function tryReconnect() {
        // 重连连接 Gateway
        const result = await Requests.openGateway({
            compress: true,
            fromDisconnect: true,
            lastProcessedSn: lastSn,
            lastSessionId: lastSessionId,
        })
        if (!result.success) {
            // 重连失败，按照指数回退重试
            handleOpenGatewayInfiniteRetry(Math.min(duration * 2, 60000))
            return
        }

        // 终于连接成功了
        const gateway = result.data
        handleGatewayReady(gateway.url)
        setState(KWebSocketState.WAITING_FOR_HANDSHAKE)
    }
    setTimeout(() => {
        tryReconnect()
    }, duration)
}

function handleWaitingForHandshake() {
    // XX秒后，如果还~在等待握手状态，则认为超时了
    setTimeout(() => {
        if (shared.webSocketState === KWebSocketState.WAITING_FOR_HANDSHAKE) {
            setWaitingForRetry()
            setState(KWebSocketState.OPENING_GATEWAY, { afterMillis: 2000 })
        }
    }, HANDSHAKE_TIMEOUT_MILLIS)
}

function handleConnected() {
    if (pingSenderInterval) {
        return
    }

    // 在连接中，每隔30秒发一次心跳ping包包
    function intervalTask() {
        if (shared.webSocketState === KWebSocketState.CONNECTED) {
            setState(KWebSocketState.WAITING_FOR_HEARTBEAT_RESPONSE)
            sendHeartbeatRequest()
        }
        else {
            // 状态发生了变化的话，这个interval也就不运行了
            if (pingSenderInterval) {
                clearInterval(pingSenderInterval)
                pingSenderInterval = null
            }
        }
    }
    pingSenderInterval = setInterval(intervalTask, HEARTBEAT_INTERVAL_MILLIS)

    // 先发一个
    intervalTask()
}

function handleWaitingForHeartbeatResponse() {
    // XX秒后，如果还~在等待Pong的状态，则认为超时了
    setTimeout(() => {
        if (shared.webSocketState === KWebSocketState.WAITING_FOR_HEARTBEAT_RESPONSE) {
            setWaitingForRetry()
            setState(KWebSocketState.WAITING_FOR_HEARTBEAT_RESPONSE_1ST_RETRY, { afterMillis: 2000 })
        }
    }, HEARTBEAT_WAIT_TIMEOUT_MILLIS)
}

function handleWaitingForPong1stRetry() {
    // 先发两次心跳ping (2, 4)
    setTimeout(sendHeartbeatRequest, REPING1_WAIT_DURATION_MILLIS)
    setTimeout(sendHeartbeatRequest, REPING2_WAIT_DURATION_MILLIS)

    // 发过ping了，如果XX秒后，还~没收到Pong，则认为超时了，触发断线重连
    setTimeout(() => {
        if (shared.webSocketState === KWebSocketState.WAITING_FOR_HEARTBEAT_RESPONSE_1ST_RETRY) {
            // 如果不成功，回退到第2步，但尝试两次resume
            setWaitingForRetry()
            setState(KWebSocketState.WAITING_FOR_HEARTBEAT_RESPONSE_LAST_RETRY)
        }
    }, WAIT_PONGS_TIMEOUT_MILLIS + REPING1_WAIT_DURATION_MILLIS + REPING2_WAIT_DURATION_MILLIS)
}

function handleWaitingForPongLastRetry() {
    // 尝试两次Resume (8, 16)
    setTimeout(sendResumeRequest, RESUME_REQUEST1_DURATION_MILLIS)
    setTimeout(sendResumeRequest, RESUME_REQUEST2_DURATION_MILLIS)
    setWaitingForRetry()
    setState(KWebSocketState.WAITING_FOR_RESUME_OK, { afterMillis: RESUME_REQUEST1_DURATION_MILLIS })
}

function handleWaitingForResumeOk() {
    // 如果XX秒后，还~在等待ResumeOk的状态，则认为超时了
    setTimeout(() => {
        // 回到无限重试状态
        if (shared.webSocketState === KWebSocketState.WAITING_FOR_RESUME_OK) {
            setState(KWebSocketState.OPENING_GATEWAY_AFTER_DISCONNECT)
        }
    }, WAIT_RESUME_OK_TIMEOUT_MILLIS)
}

/**
 * 状态机函数
 */
export async function handleStateUpdated() {
    switch (shared.webSocketState) {
        case KWebSocketState.OPENING_GATEWAY:
            handleOpenGateway({ isRetry: false, isLastRetry: false })
            break

        case KWebSocketState.OPENING_GATEWAY_AFTER_DISCONNECT:
            handleOpenGatewayInfiniteRetry(1000)
            break

        case KWebSocketState.OPENING_GATEWAY_1ST_RETRY:
            handleOpenGateway({ isRetry: true, isLastRetry: false })
            break

        case KWebSocketState.OPENING_GATEWAY_LAST_RETRY:
            handleOpenGateway({ isRetry: true, isLastRetry: true })
            break

        case KWebSocketState.WAITING_FOR_HANDSHAKE:
            handleWaitingForHandshake()
            break

        case KWebSocketState.CONNECTED:
            handleConnected()
            break

        case KWebSocketState.WAITING_FOR_HEARTBEAT_RESPONSE:
            handleWaitingForHeartbeatResponse()
            break

        case KWebSocketState.WAITING_FOR_HEARTBEAT_RESPONSE_1ST_RETRY:
            handleWaitingForPong1stRetry()
            break

        case KWebSocketState.WAITING_FOR_HEARTBEAT_RESPONSE_LAST_RETRY:
            handleWaitingForPongLastRetry()
            break

        case KWebSocketState.WAITING_FOR_RESUME_OK:
            handleWaitingForResumeOk()
            break
    }
}

async function handleReceivedTextChannelEvent(sn: number, messageEvent: KEvent<KTextChannelExtra>) {
    info("Received message:", messageEvent)
    if (messageEvent.type === KEventType.Text || messageEvent.type === KEventType.KMarkdown) {
        if (messageEvent.extra.mention_roles.includes(734892820) || messageEvent.extra.mention.includes('734892820')) {
            const prompt = promptFromMessage(messageEvent.content)
            const messageId = messageEvent.msg_id

            info("Mentioned by", messageEvent.author_id, "in", messageEvent.target_id, "with content:", prompt)

            await Requests.createChannelMessage({
                type: KEventType.KMarkdown,
                target_id: messageEvent.target_id,
                content: "稍等，正在生成回复...",
                quote: messageId,
            })

            const nickname = messageEvent.extra.author.nickname
            const context = getContext(messageEvent.author_id)
            const openAIResponse = await chatCompletionWithoutStream(nickname, context, prompt)
            info("OpenAI response:", openAIResponse)

            const result = await Requests.createChannelMessage({
                type: KEventType.KMarkdown,
                target_id: messageEvent.target_id,
                content: openAIResponse,
                quote: messageId,
            })
            info("Sent message:", result)
        }
    }
}

function promptFromMessage(rawContent: string): string {
    let content = rawContent.replace(/\(rol\)\d+\(rol\)/g, '')
    content = rawContent.replace(/\(met\)\d+\(met\)/g, '')
    return content
}

function handleReceivedSystemEvent(sn: number, event: KEvent<KSystemEventExtra>) {
    info("Received system event:", event)
}

function handleReceivedEvent(sn: number | undefined, event: KEvent<unknown>) {
    if (!sn) {
        error("Received a message without sn")
        return
    }
    lastSn = sn

    if (event.type === KEventType.System) {
        handleReceivedSystemEvent(sn, event as KEvent<KSystemEventExtra>)
    }
    else {
        handleReceivedTextChannelEvent(sn, event as KEvent<KTextChannelExtra>)
    }
}

function handleReceivedHandshakeResult(sessionId: string) {
    info("Server handshake success", "sessionId=", sessionId)
    lastSessionId = sessionId

    if (shared.webSocketState === KWebSocketState.WAITING_FOR_HANDSHAKE) {
        setState(KWebSocketState.CONNECTED)
    }
}

function handleReceivedPing() {
    warn("意外的收到了来自服务器的ping包")
    warn("不慌，我们pong回去！")
    sendKMessage({ s: KMessageKind.Pong, d: {} })
}

function handleReceivedPong() {
    info("Server ponged back")
    if (shared.webSocketState === KWebSocketState.WAITING_FOR_HEARTBEAT_RESPONSE
        || shared.webSocketState === KWebSocketState.WAITING_FOR_HEARTBEAT_RESPONSE_1ST_RETRY
    ) {
        // 如果是等待Pong的状态，那么就进入正常的连接状态
        setState(KWebSocketState.CONNECTED)
    }
}

function handleReceivedReconnect() {
    // 任何时候，收到reconnect包，应该将当前消息队列，sn等全部清空
    // 然后回到第一步，否则消息可能会错乱
    lastSn = 0
    lastSessionId = ''
    setState(KWebSocketState.OPENING_GATEWAY)
}

function handleReceivedResumeAck(sessionId: string) {
    info("Server acked resume")
    lastSessionId = sessionId
    if (shared.webSocketState === KWebSocketState.WAITING_FOR_RESUME_OK) {
        setState(KWebSocketState.CONNECTED)
    }
}

export async function dispatchKMessage({ s: messageKind, d: data, sn: serialNumber }: KMessage<unknown>) {
    switch (messageKind) {
        case KMessageKind.Event:
            handleReceivedEvent(serialNumber, data as KEvent<unknown>)
            break

        case KMessageKind.HandshakeResult:
            handleReceivedHandshakeResult((data as KHandshakeMessage).session_id)
            break

        case KMessageKind.Ping:
            handleReceivedPing()
            break

        case KMessageKind.Pong:
            handleReceivedPong()
            break

        case KMessageKind.Reconnect:
            handleReceivedReconnect()
            break

        case KMessageKind.ResumeAck:
            handleReceivedResumeAck((data as KResumeAckMessage).session_id)
            break
    }
}

export async function webSocketInitialize() {
    setState(KWebSocketState.OPENING_GATEWAY)
}

function handleGatewayReady(gatewayUrl: string) {
    info("Gateway URL ready", gatewayUrl)
    shared.webSocketAddress = gatewayUrl
    const ws = new WebSocket(shared.webSocketAddress)
    ws.onopen = onWebSocketOpen
    ws.onmessage = onWebSocketMessage
    ws.onclose = onWebSocketClose
    ws.onerror = onWebSocketError
    shared.webSocket = ws
}

function onWebSocketOpen(ev: WebSocket.Event) {
    info('onWebSocketOpen', ev)
}

function onWebSocketClose(ev: WebSocket.CloseEvent) {
    info('onWebSocketClose', ev.reason)
}

function onWebSocketError(ev: WebSocket.ErrorEvent) {
    info('onWebSocketError', ev)
}

function onWebSocketMessage(ev: WebSocket.MessageEvent) {
    // 传来的信令对象，根据当时的compress参数，决定这会儿要不要解压
    const message: KMessage<unknown> = shared.webSocketCompressEnabled
        ? decompressKMessage(ev.data as Buffer)
        : JSON.parse(ev.data as string)

    info("Incoming message:", JSON.stringify(message))

    // 分派消息
    dispatchKMessage(message)
}

interface SetStateProps {
    afterMillis?: number
}

interface RetryProps {
    isRetry: boolean
    isLastRetry: boolean
}
