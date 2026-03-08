/**
 * 服务器 (Guild)
 */
export interface KGuild {
  id: string
  name: string
  topic: string
  user_id: string
  icon: string
  notify_type: number
  region: string
  enable_open: boolean
  open_id: string
  default_channel_id: string
  welcome_channel_id: string
}

/**
 * 角色
 */
export interface KRole {
  role_id: number
  name: string
  color: number
  position: number
  hoist: number
  mentionable: number
  permissions: number
}

/**
 * 服务器成员列表分页信息
 */
export interface KGuildMemberListMeta {
  page: number
  page_total: number
  page_size: number
  total: number
}
