import { KEventType } from './event-type'

/**
 * KOOK API 标准响应
 */
export interface KResponse<T> {
  code: number
  message: string
  data: T
}

/**
 * 扩展响应（SDK 内部使用），附加 success 标记
 */
export interface KResponseExt<T> extends KResponse<T> {
  success: boolean
}

/**
 * 弱类型响应（可选字段）
 */
export interface KResponseWeak<T = undefined> {
  code: number
  message?: string
  data?: T
}

/**
 * 限速 Header 信息
 */
export interface KRateLimitHeader {
  requestsAllowed: number
  requestsRemaining: number
  timestampSecondsWhenFullyRecovered: number
  bucket: string
  didTriggeredGlobalRateLimit: boolean
}

/**
 * 响应 Header 包装
 */
export interface KResponseHeader {
  rateLimit: KRateLimitHeader
}

/**
 * HTTP 请求方法
 */
export const RequestMethods = ['GET', 'POST', 'PUT', 'DELETE'] as const
export type RequestMethod = (typeof RequestMethods)[number]

// --- Gateway ---

export interface KGatewayResult {
  url: string
}

// --- Message ---

export interface CreateMessageProps {
  type: KEventType
  target_id: string
  content: string
  quote?: string
  nonce?: string
  temp_target_id?: string
  reply_msg_id?: string
}

export interface CreateMessageResult {
  msg_id: string
  msg_timestamp: number
  nonce: string
}

export interface UpdateMessageProps {
  msg_id: string
  content: string
  quote?: string
  temp_target_id?: string
}

export interface DeleteMessageProps {
  msg_id: string
}

export interface AddReactionProps {
  msg_id: string
  emoji: string
}

export interface DeleteReactionProps {
  msg_id: string
  emoji: string
  user_id?: string
}

export interface ListMessageProps {
  target_id: string
  msg_id?: string
  pin?: number
  flag?: string
  page_size?: number
}

export interface ViewMessageProps {
  msg_id: string
}

// --- Asset ---

export interface CreateAssetResult {
  url: string
}

// --- User ---

export interface GetUserProps {
  user_id: string
  guild_id?: string
}

// --- Guild ---

export interface ListGuildProps {
  page?: number
  page_size?: number
  sort?: string
}

export interface ViewGuildProps {
  guild_id: string
}

export interface ListGuildMemberProps {
  guild_id: string
  channel_id?: string
  search?: string
  role_id?: number
  mobile_verified?: number
  active_time?: number
  joined_at?: number
  page?: number
  page_size?: number
  filter_user_id?: string
}

export interface SetGuildNicknameProps {
  guild_id: string
  nickname?: string
  user_id?: string
}

export interface KickoutGuildMemberProps {
  guild_id: string
  target_id: string
}

// --- Channel ---

export interface ListChannelProps {
  guild_id: string
  type?: number
  page?: number
  page_size?: number
}

export interface ViewChannelProps {
  target_id: string
}

export interface CreateChannelProps {
  guild_id: string
  name: string
  type?: number
  parent_id?: string
  limit_amount?: number
  voice_quality?: string
}

export interface DeleteChannelProps {
  channel_id: string
}

export interface MoveUserProps {
  target_id: string
  user_ids: string[]
}

// --- Guild Role ---

export interface ListGuildRoleProps {
  guild_id: string
  page?: number
  page_size?: number
}

export interface CreateGuildRoleProps {
  guild_id: string
  name?: string
}

export interface UpdateGuildRoleProps {
  role_id: number
  name?: string
  color?: number
  hoist?: number
  mentionable?: number
  permissions?: number
}

export interface DeleteGuildRoleProps {
  guild_id: string
  role_id: number
}

export interface GrantRevokeRoleProps {
  guild_id: string
  user_id: string
  role_id: number
}

// --- Direct Message ---

export interface ListDirectMessageProps {
  chat_code?: string
  target_id?: string
  msg_id?: string
  flag?: string
  page_size?: number
}

export interface CreateDirectMessageProps {
  target_id?: string
  chat_code?: string
  type: KEventType
  content: string
  quote?: string
  nonce?: string
}

export interface UpdateDirectMessageProps {
  msg_id: string
  content: string
  quote?: string
}

export interface DeleteDirectMessageProps {
  msg_id: string
}

export interface DirectMessageReactionProps {
  msg_id: string
  emoji: string
}

// --- User Chat ---

export interface ListUserChatProps {
  page?: number
  page_size?: number
}

export interface ViewUserChatProps {
  chat_code: string
}

export interface CreateUserChatProps {
  target_id: string
}

export interface DeleteUserChatProps {
  chat_code: string
}

// --- 分页 ---

export interface PaginatedData<T> {
  items: T[]
  meta: {
    page: number
    page_total: number
    page_size: number
    total: number
  }
  sort: Record<string, number>
}
