import { ChatDirectiveItem, ParseEventResultValid } from '..'

import { ConfigUtils } from '../../../utils/config/config'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: 'using_namespace',
  parameterDescription: 'on|off',
  description: '是否允许省略"@我"而直接使用指令',
  defaultValue: undefined,
  permissionGroups: ['everyone'],
  async handler(event: ParseEventResultValid) {
    const guildId = event.originalEvent.extra.guild_id
    const channelId = event.originalEvent.target_id

    if (event.parameter === 'on') {
      ConfigUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        allowOmittingMentioningMe: true,
      })
      respondToUser({
        originalEvent: event.originalEvent,
        content: '好！后续指令无需再@我即可执行！',
      })
      return
    }

    if (event.parameter === 'off') {
      ConfigUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        allowOmittingMentioningMe: false,
      })
      respondToUser({
        originalEvent: event.originalEvent,
        content: 'disabled `allowOmittingMentioningMe`',
      })
      return
    }

    ConfigUtils.main.channelConfigs.updateChannelConfig({
      channelId,
      allowOmittingMentioningMe: false,
    })
    respondToUser({
      originalEvent: event.originalEvent,
      content: '参数不合法，应该输入 on 或者 off',
    })
  },
} satisfies ChatDirectiveItem
