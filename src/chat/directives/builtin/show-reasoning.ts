import { configUtils } from '../../../utils/config/config'

import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: 'show-reasoning',
  parameterDescription: 'on|off',
  description: '设置当前频道是否显示思考过程',
  defaultValue: undefined,
  permissionGroups: ['admin'],
  withContext: false,
  async handler(event: ParseEventResultValid) {
    const channelId = event.originalEvent.target_id
    const value = (event.parameter || '').trim().toLowerCase()

    if (value === 'on') {
      await configUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        showReasoningProcess: true,
      })
      respondToUser({
        originalEvent: event.originalEvent,
        content: '已开启：将显示思考过程',
      })
      return
    }

    if (value === 'off') {
      await configUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        showReasoningProcess: false,
      })
      respondToUser({
        originalEvent: event.originalEvent,
        content: '已关闭：不显示思考过程',
      })
      return
    }

    const channelConfig = await configUtils.main.channelConfigs.getChannelConfig({ channelId })
    respondToUser({
      originalEvent: event.originalEvent,
      content:
        `当前 showReasoningProcess=${channelConfig?.showReasoningProcess ? 'on' : 'off'}。` +
        `\n用法: /show-reasoning on|off`,
    })
  },
} satisfies ChatDirectiveItem
