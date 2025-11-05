import { configUtils } from '../../../utils/config/config'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: 'assign',
  parameterDescription: '<user-id> <role-id>',
  description: '将指定用户分配到指定角色',
  defaultValue: undefined,
  permissionGroups: ['developer'],
  async handler(event: ParseEventResultValid) {
    const channelId = event.originalEvent.target_id

    if (event.parameter === 'on') {
      configUtils.main.channelConfigs.updateChannelConfig({
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
      configUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        allowOmittingMentioningMe: false,
      })
      respondToUser({
        originalEvent: event.originalEvent,
        content: 'disabled `allowOmittingMentioningMe`',
      })
      return
    }

    configUtils.main.channelConfigs.updateChannelConfig({
      channelId,
      allowOmittingMentioningMe: false,
    })
    respondToUser({
      originalEvent: event.originalEvent,
      content: '参数不合法，应该输入 on 或者 off',
    })
  },
} satisfies ChatDirectiveItem
