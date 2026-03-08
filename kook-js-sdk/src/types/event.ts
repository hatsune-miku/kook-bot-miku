import { KEventType } from './event-type'
import { KSystemEventExtra } from './system-event'
import { KTextChannelExtra } from './channel'

/**
 * 频道类型
 */
export const ChannelTypes = {
  Group: 'GROUP',
  Person: 'PERSON',
  Broadcast: 'BROADCAST',
} as const

export type ChannelType = (typeof ChannelTypes)[keyof typeof ChannelTypes]

/**
 * KOOK 事件
 *
 * WebSocket 信令 s=0 时，d 字段的结构
 */
export interface KEvent<KExtraType = KTextChannelExtra | KSystemEventExtra | unknown> {
  channel_type: ChannelType
  type: KEventType

  /**
   * 发送目的。频道消息类时，代表 channel_id
   * 如果 channel_type 为 GROUP 且 type 为 System，则代表 guild_id
   */
  target_id: string

  /**
   * 发送者 ID，1 代表系统
   */
  author_id: string

  /**
   * 消息内容。文件、图片、视频时，为 URL
   */
  content: string

  msg_id: string

  /**
   * 消息发送时间的毫秒时间戳
   */
  msg_timestamp: number

  /**
   * 与用户消息发送 API 中传的 nonce 一致
   */
  nonce: string

  extra: KExtraType
}
