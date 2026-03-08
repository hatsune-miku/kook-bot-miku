/**
 * KOOK WebSocket 连接状态
 */
export const KWSStates = {
  Idle: 'IDLE',
  OpeningGateway: 'OPENING_GATEWAY',
  OpeningGateway1stRetry: 'OPENING_GATEWAY_1ST_RETRY',
  OpeningGatewayLastRetry: 'OPENING_GATEWAY_LAST_RETRY',
  OpeningGatewayAfterDisconnect: 'OPENING_GATEWAY_AFTER_DISCONNECT',
  WaitingForHandshake: 'WAITING_FOR_HANDSHAKE',
  Connected: 'CONNECTED',
  WaitingForHeartbeatResponse: 'WAITING_FOR_HEARTBEAT_RESPONSE',
  WaitingForHeartbeatResponse1stRetry: 'WAITING_FOR_HEARTBEAT_RESPONSE_1ST_RETRY',
  WaitingForHeartbeatResponseLastRetry: 'WAITING_FOR_HEARTBEAT_RESPONSE_LAST_RETRY',
  WaitingForResumeOk: 'WAITING_FOR_RESUME_OK',
} as const

export type KWSState = (typeof KWSStates)[keyof typeof KWSStates]

/**
 * 打开 Gateway 的参数
 */
export interface OpenGatewayProps {
  compress: boolean
  fromDisconnect: boolean
  lastProcessedSn?: number
  lastSessionId?: string
}

/**
 * 握手消息
 */
export interface KHandshakeMessage {
  session_id: string
}

/**
 * Resume ACK 消息
 */
export interface KResumeAckMessage {
  session_id: string
}

/**
 * WebSocket 定时配置（所有时间单位为毫秒）
 */
export interface WsTimingConfig {
  handshakeTimeoutMs: number
  heartbeatIntervalMs: number
  heartbeatTimeoutMs: number
  pongTimeoutMs: number
  resumeTimeoutMs: number
  gatewayRetryDelayMs: number
  gatewayRetryFinalDelayMs: number
  gatewayPostDisconnectDelayMs: number
  heartbeatRetryDelayMs: number
  repingFirstDelayMs: number
  repingFinalDelayMs: number
  resumeFirstDelayMs: number
  resumeFinalDelayMs: number
  infiniteRetryInitialMs: number
  infiniteRetryMaxMs: number
}

/**
 * 默认 WebSocket 定时配置
 */
export const defaultWsTimingConfig: WsTimingConfig = {
  handshakeTimeoutMs: 6000,
  heartbeatIntervalMs: 30000,
  heartbeatTimeoutMs: 6000,
  pongTimeoutMs: 6000,
  resumeTimeoutMs: 6000,
  gatewayRetryDelayMs: 2000,
  gatewayRetryFinalDelayMs: 4000,
  gatewayPostDisconnectDelayMs: 2000,
  heartbeatRetryDelayMs: 2000,
  repingFirstDelayMs: 2000,
  repingFinalDelayMs: 4000,
  resumeFirstDelayMs: 8000,
  resumeFinalDelayMs: 16000,
  infiniteRetryInitialMs: 1000,
  infiniteRetryMaxMs: 60000,
}
