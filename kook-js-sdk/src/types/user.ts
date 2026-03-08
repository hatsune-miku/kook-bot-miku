/**
 * KOOK 用户
 */
export interface KUser {
  id: string
  username: string
  nickname: string
  identify_num: string
  online: boolean
  bot: boolean

  /**
   * 状态，0/1 代表正常，10 代表封禁
   */
  status: number

  /**
   * 头像 URL
   */
  avatar: string

  /**
   * VIP 头像 URL，可能为 GIF
   */
  vip_avatar: string

  is_vip: boolean
  is_sys: boolean
  mobile_verified: boolean
  roles: number[]
}

/**
 * Bot 自身用户信息（/api/v3/user/me 返回）
 */
export interface KSelfUser {
  id: string
  username: string
  identify_num: string
  online: boolean
  os: string
  status: number
  avatar: string
  banner: string
  bot: boolean
  mobile_verified: boolean
  mobile_prefix: string
  mobile: string
  invited_count: number
}

/**
 * 用户详情（/api/v3/user/view 返回）
 */
export interface KUserDetail extends KUser {
  joined_at: number
  active_time: number
}
