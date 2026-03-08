/**
 * KOOK 信令类型
 *
 * 定义 WebSocket 消息的信令种类（s 字段）
 */
export const KMessageKinds = {
  Event: 0,
  Hello: 1,
  Ping: 2,
  Pong: 3,
  Resume: 4,
  Reconnect: 5,
  ResumeAck: 6,
} as const

export type KMessageKind = (typeof KMessageKinds)[keyof typeof KMessageKinds]

/**
 * KOOK WebSocket 信令
 *
 * @param s 信令类型
 * @param d 数据字段
 * @param sn 序列号，仅在 s=0 时有
 */
export interface KMessage<T> {
  s: KMessageKind
  d: T
  sn?: number
}
