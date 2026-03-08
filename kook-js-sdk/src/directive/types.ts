import { KEvent, KTextChannelExtra, KUser } from '../types'

/**
 * 指令解析结果
 */
export type ParseDirectiveResult = ParseDirectiveResultNoMatch | ParseDirectiveResultMatch

export interface ParseDirectiveResultNoMatch {
  matched: false
}

export interface ParseDirectiveResultMatch {
  matched: true
  directive: string
  parameter: string | undefined
  mentionRoleIds: number[]
  mentionUserIds: string[]
  originalEvent: KEvent<KTextChannelExtra>
  userProperties: UserProperties
}

/**
 * 用户属性
 */
export interface UserProperties {
  roles: string[]
  metadata: KUser
}

/**
 * 指令处理器上下文
 */
export interface DirectiveContext {
  event: KEvent<KTextChannelExtra>
  directive: string
  parameter: string | undefined
  user: KUser
  mentionRoleIds: number[]
  mentionUserIds: string[]
}

/**
 * 指令处理器函数
 */
export interface DirectiveHandler {
  (context: DirectiveContext): Promise<void>
}

/**
 * 权限解析器
 */
export interface PermissionResolver {
  (userId: string, userRoles: string[], requiredPermissions: string[]): boolean
}

/**
 * 指令定义
 */
export interface DirectiveItem {
  triggerWord: string | string[]
  parameterDescription: string
  description: string
  defaultValue?: string
  permissionGroups: string[]
  handler: DirectiveHandler
}
