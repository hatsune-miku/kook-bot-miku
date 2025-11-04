import { ChatDirectiveItem, ParseEventResultValid } from '..'

import { ConfigUtils } from '../../../utils/config/config'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: ['unwhitelist', 'untrust'],
  parameterDescription: '<guild-id>',
  description: '将指定服务器移出白名单',
  defaultValue: undefined,
  permissionGroups: ['admin'],
  withContext: false,
  async handler(event: ParseEventResultValid) {
    const guildId = event.parameter
    if (!guildId) {
      respondToUser({
        originalEvent: event.originalEvent,
        content: 'guild id 不能为空~',
      })
      return
    }
    ConfigUtils.main.whitelistedGuilds.removeWhitelistedGuild({ guildId })
    respondToUser({
      originalEvent: event.originalEvent,
      content: `已将 ${guildId} 移出白名单`,
    })
  },
} satisfies ChatDirectiveItem
