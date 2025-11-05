import { configUtils } from '../../../utils/config/config'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: ['whitelist', 'trust'],
  parameterDescription: '<guild-id> <nickname>',
  description: '将指定服务器加入白名单',
  defaultValue: undefined,
  permissionGroups: ['admin'],
  withContext: false,
  async handler(event: ParseEventResultValid) {
    const [guildId, nickname] = (event.parameter ?? '').split(' ')
    if (!guildId || !nickname) {
      respondToUser({
        originalEvent: event.originalEvent,
        content: 'guild-id 和 nickname 不能为空~',
      })
      return
    }

    configUtils.main.whitelistedGuilds.addWhitelistedGuild({ guildId, name: nickname })
    respondToUser({
      originalEvent: event.originalEvent,
      content: `已将 ${guildId} (${nickname}) 加入白名单`,
    })
  },
} satisfies ChatDirectiveItem
