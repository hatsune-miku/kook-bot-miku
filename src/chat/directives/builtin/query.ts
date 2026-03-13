import { kookUserStore } from '../../../cached-store/kook-user'
import { displayNameFromUser } from '../../../utils'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: 'query',
  parameterDescription: '@user',
  description: '查询@的人的基本信息',
  defaultValue: undefined,
  permissionGroups: ['everyone'],
  async handler(event: ParseEventResultValid) {
    const mayBeTargetUserId = event.parameter
    if (!mayBeTargetUserId && event.mentionUserIds.length === 0 && event.mentionRoleIds.length > 0) {
      // 用户常见的错误，@到role而非具体用户
      respondToUser({
        originalEvent: event.originalEvent,
        content: '你应该@具体用户，而不是@某个服务器角色，注意区分哦',
      })
      return
    }

    const userIds = event.mentionUserIds
    if (userIds.length !== 1 && !mayBeTargetUserId) {
      respondToUser({
        originalEvent: event.originalEvent,
        content: '能且只能同时查询 1 位用户的信息！',
      })
      return
    }

    const user = await kookUserStore.getUser({
      userId: mayBeTargetUserId || userIds[0],
      guildId: event.originalEvent.extra.guild_id,
    })

    const displayName = displayNameFromUser(user.metadata)
    const list = [
      '名字: ' + displayName,
      '昵称: ' + user.metadata.nickname,
      '权限: ' + user.roles.join(', '),
      'Bot: ' + (user.metadata.bot ? '是' : '不是'),
      'BUFF 会员: ' + (user.metadata.is_vip ? '是' : '不是'),
      '系统账号: ' + (user.metadata.is_sys ? '是' : '不是'),
      '在线状态: ' + (user.metadata.online ? '在线' : '离线'),
      '封禁状态: ' + (user.metadata.status === 10 ? '封禁中' : '无'),
      '手机验证: ' + (user.metadata.mobile_verified ? '已验证' : '未验证'),
    ]
    respondToUser({
      originalEvent: event.originalEvent,
      content: list.join('\n'),
    })
  },
} satisfies ChatDirectiveItem
