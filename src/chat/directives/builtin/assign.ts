import { ConfigUtils } from '../../../utils/config/config'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: 'print_context',
  parameterDescription: '',
  description: '(调试限定) 输出当前频道的对话上下文',
  defaultValue: undefined,
  permissionGroups: ['developer'],
  async handler(event: ParseEventResultValid) {
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
