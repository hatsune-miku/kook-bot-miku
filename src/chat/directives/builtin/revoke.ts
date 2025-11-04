import { map } from 'radash'

import { kookUserStore } from '../../../cached-store/kook-user'
import { ConfigUtils } from '../../../utils/config/config'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'

export default {
  triggerWord: 'revoke',
  parameterDescription: '<role> @user',
  description: '移除@的人的 <role> 角色',
  defaultValue: undefined,
  permissionGroups: ['admin'],
  async handler(event: ParseEventResultValid) {
    if (event.mentionUserIds.length === 0 && event.mentionRoleIds.length > 0) {
      // 用户常见的错误，@到role而非具体用户
      this.respondToUser({
        originalEvent: event.originalEvent,
        content: '你应该@具体用户，而不是@某个服务器角色，注意区分哦',
      })
      return
    }

    const role = event.parameter
    if (!role) {
      this.respondToUser({
        originalEvent: event.originalEvent,
        content: '权限不能为空',
      })
      return
    }

    const mentionedUsers = await map(event.mentionUserIds, (userId) =>
      kookUserStore.getUser({ userId, guildId: event.originalEvent.extra.guild_id })
    )

    mentionedUsers.forEach((user) => {
      this.revokeRole(user, role)
    })

    await Promise.all(
      mentionedUsers.map((user) =>
        ConfigUtils.main.userRoles.revokeUserRole({
          userId: user.metadata.id,
          role: role,
        })
      )
    )

    this.respondToUser({
      originalEvent: event.originalEvent,
      content: `权限设置已更新~`,
    })
  },
} satisfies ChatDirectiveItem
