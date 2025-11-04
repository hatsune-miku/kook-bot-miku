import { ChatDirectiveItem, ParseEventResultValid } from '..'

import { ConfigUtils } from '../../../utils/config/config'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: 'show-whitelist',
  parameterDescription: '',
  description: '查看白名单服务器',
  defaultValue: undefined,
  permissionGroups: ['admin'],
  withContext: false,
  async handler(event: ParseEventResultValid) {
    const guilds = await ConfigUtils.main.whitelistedGuilds.getWhitelistedGuilds()
    respondToUser({
      originalEvent: event.originalEvent,
      content: `白名单服务器: ${Object.entries(guilds)
        .map((k, v) => `${k}: ${v}`)
        .join(', ')}`,
    })
  },
} satisfies ChatDirectiveItem
