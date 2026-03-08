import { KEventType } from './event-type'
import { KUser } from './user'

/**
 * 文字频道消息扩展字段
 */
export interface KTextChannelExtra {
  type: KEventType
  guild_id: string
  channel_name: string
  mention: string[]
  mention_all: boolean
  mention_roles: number[]
  mention_here: boolean
  author: KUser
}
