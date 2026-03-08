import { parseDirective } from './parser'
import { DirectiveRegistry } from './registry'
import { DirectiveContext, PermissionResolver } from './types'

import { KEvent, KTextChannelExtra } from '../types'
import { Logger, createLogger } from '../utils/logger'

/**
 * 默认权限解析器：everyone 权限组通过，其他需要角色匹配
 */
function defaultPermissionResolver(
  _userId: string,
  userRoles: string[],
  requiredPermissions: string[]
): boolean {
  if (requiredPermissions.includes('everyone')) {
    return true
  }
  return userRoles.some((r) => requiredPermissions.includes(r))
}

/**
 * 指令分发器配置
 */
export interface DirectiveDispatcherConfig {
  registry: DirectiveRegistry
  permissionResolver?: PermissionResolver
  logger?: Logger
  onPermissionDenied?: (context: DirectiveContext) => Promise<void>
}

/**
 * 指令分发器
 *
 * 解析消息中的指令，检查权限，分发到对应的处理器
 */
export class DirectiveDispatcher {
  private registry: DirectiveRegistry
  private permissionResolver: PermissionResolver
  private logger: Logger
  private onPermissionDenied?: (context: DirectiveContext) => Promise<void>

  constructor(config: DirectiveDispatcherConfig) {
    this.registry = config.registry
    this.permissionResolver = config.permissionResolver ?? defaultPermissionResolver
    this.logger = config.logger ?? createLogger({ prefix: 'kook-directive' })
    this.onPermissionDenied = config.onPermissionDenied
  }

  /**
   * 尝试从事件中分发指令
   *
   * @returns true 如果事件被处理为指令
   */
  async dispatch(event: KEvent<KTextChannelExtra>): Promise<boolean> {
    const parsed = parseDirective(event)
    if (!parsed) {
      return false
    }

    const directiveItem = this.registry.find(parsed.name)
    if (!directiveItem) {
      this.logger.debug('No matching directive for:', parsed.name)
      return false
    }

    const userRoles = event.extra.author.roles?.map(String) ?? []
    const userId = event.extra.author.id
    const hasPermission = this.permissionResolver(userId, userRoles, directiveItem.permissionGroups)

    const context: DirectiveContext = {
      event,
      directive: parsed.name,
      parameter: parsed.parameter ?? directiveItem.defaultValue,
      user: event.extra.author,
      mentionRoleIds: event.extra.mention_roles ?? [],
      mentionUserIds: event.extra.mention ?? [],
    }

    if (!hasPermission) {
      this.logger.warn('Permission denied for user', userId, 'on directive', parsed.name)
      if (this.onPermissionDenied) {
        try {
          await this.onPermissionDenied(context)
        } catch (e) {
          this.logger.error('Error in onPermissionDenied handler:', e)
        }
      }
      return true
    }

    try {
      await directiveItem.handler(context)
    } catch (e) {
      this.logger.error('Error executing directive', parsed.name, ':', e)
    }
    return true
  }
}
