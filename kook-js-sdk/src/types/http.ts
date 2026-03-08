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

// --- 服务器频道类型（HTTP API） ---

/**
 * 服务器频道类型
 *
 * 用于创建/查询频道时的 type 字段，注意与 WebSocket 事件中的 channel_type（GROUP/PERSON/BROADCAST）不同
 */
export const GuildChannelTypes = {
  /** 文字频道 */
  Text: 1,
  /** 语音频道 */
  Voice: 2,
} as const
export type GuildChannelType = (typeof GuildChannelTypes)[keyof typeof GuildChannelTypes]

// --- 语音质量 ---

/**
 * 语音频道音质等级
 */
export const VoiceQualities = {
  /** 流畅（低码率） */
  Smooth: '1',
  /** 正常（默认） */
  Normal: '2',
  /** 高质量（高码率） */
  High: '3',
} as const
export type VoiceQuality = (typeof VoiceQualities)[keyof typeof VoiceQualities]

// --- 服务器角色权限位 ---

/**
 * 服务器角色权限位
 *
 * 使用位运算组合，例如：`GuildPermissions.SendMessages | GuildPermissions.ViewChannels`
 *
 * 检查是否拥有权限：`(permissions & GuildPermissions.Admin) !== 0`
 */
export const GuildPermissions = {
  /** 管理员（拥有所有权限，跳过所有权限检查） */
  Admin: 1 << 0,
  /** 管理服务器（修改名称、区域等） */
  ManageGuild: 1 << 1,
  /** 查看管理日志 */
  ViewAuditLog: 1 << 2,
  /** 创建邀请 */
  CreateInvites: 1 << 3,
  /** 管理邀请 */
  ManageInvites: 1 << 4,
  /** 频道管理（创建、编辑、删除频道） */
  ManageChannels: 1 << 5,
  /** 踢出用户 */
  KickMembers: 1 << 6,
  /** 封禁用户 */
  BanMembers: 1 << 7,
  /** 管理自定义表情 */
  ManageEmojis: 1 << 8,
  /** 修改自己的昵称 */
  ChangeNickname: 1 << 9,
  /** 管理角色权限（创建、编辑、删除低于自身的角色） */
  ManageRoles: 1 << 10,
  /** 查看文字和语音频道 */
  ViewChannels: 1 << 11,
  /** 发送消息 */
  SendMessages: 1 << 12,
  /** 管理消息（删除、置顶他人消息） */
  ManageMessages: 1 << 13,
  /** 上传文件 */
  UploadFiles: 1 << 14,
  /** 语音连接 */
  ConnectVoice: 1 << 15,
  /** 语音管理（移动、踢出语音频道内用户） */
  ManageVoice: 1 << 16,
  /** 提及 @全体成员 */
  MentionEveryone: 1 << 17,
  /** 添加反应 */
  AddReactions: 1 << 18,
  /** 跟随反应（使用已有的反应） */
  UseExistingReactions: 1 << 19,
  /** 被动连接语音（仅可通过邀请/移动加入语音） */
  PassiveVoice: 1 << 20,
  /** 仅使用按键说话 */
  PushToTalkOnly: 1 << 21,
  /** 自由麦克风（不受语音限制） */
  FreeMicrophone: 1 << 22,
  /** 说话（在语音频道中发出声音） */
  Speak: 1 << 23,
  /** 服务器静音（自我静音） */
  ServerMute: 1 << 24,
  /** 服务器耳聋（自我耳聋） */
  ServerDeafen: 1 << 25,
  /** 修改他人昵称 */
  ManageNicknames: 1 << 26,
  /** 播放伴奏（在语音频道中播放音乐） */
  PlayAccompaniment: 1 << 27,
  /** 屏幕分享 */
  ScreenShare: 1 << 28,
  /** 回复帖子 */
  ReplyInThreads: 1 << 29,
  /** 启用录制（录制语音频道） */
  EnableRecording: 1 << 30,
} as const
export type GuildPermission = (typeof GuildPermissions)[keyof typeof GuildPermissions]

// --- 网关 ---

export interface KGatewayResult {
  url: string
}

// --- 频道消息 ---

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
  reply_msg_id?: string
  extra?: {
    type: KEventType
    target_id: string
  }
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

// --- 媒体资源 ---

export interface CreateAssetResult {
  url: string
}

// --- 用户 ---

export interface GetUserProps {
  user_id: string
  guild_id?: string
}

// --- 服务器 ---

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

// --- 频道 ---

export interface ListChannelProps {
  guild_id: string
  /** 频道类型 */
  type?: GuildChannelType
  page?: number
  page_size?: number
}

export interface ViewChannelProps {
  target_id: string
}

export interface CreateChannelProps {
  guild_id: string
  /** 频道名称 */
  name: string
  /** 频道类型，默认为文字频道 */
  type?: GuildChannelType
  /** 父分组频道 ID */
  parent_id?: string
  /** 语音频道人数上限，0~99，0 为无限制，仅语音频道有效 */
  limit_amount?: number
  /** 语音频道音质等级，默认为 Normal（正常），仅语音频道有效 */
  voice_quality?: VoiceQuality
  /** 是否为分组频道，0 否 1 是。设为 1 时仅 guild_id 和 name 生效 */
  is_category?: 0 | 1
}

export interface DeleteChannelProps {
  channel_id: string
}

export interface MoveUserProps {
  target_id: string
  user_ids: string[]
}

// --- 服务器角色 ---

export interface ListGuildRoleProps {
  guild_id: string
  page?: number
  page_size?: number
}

export interface CreateGuildRoleProps {
  guild_id: string
  /** 角色名称，默认为"新角色" */
  name?: string
}

export interface UpdateGuildRoleProps {
  guild_id: string
  role_id: number
  /** 角色名称 */
  name?: string
  /** 角色颜色，RGB 整数值（如 0xFF0000 = 红色 = 16711680） */
  color?: number
  /** 是否在成员列表中单独展示该角色的成员，0 否 1 是 */
  hoist?: 0 | 1
  /** 是否允许任何人 @提及 此角色，0 否 1 是 */
  mentionable?: 0 | 1
  /** 权限位字段，使用 GuildPermissions 中的值通过位运算组合 */
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

// --- 私信 ---

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

// --- 私聊会话 ---

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
