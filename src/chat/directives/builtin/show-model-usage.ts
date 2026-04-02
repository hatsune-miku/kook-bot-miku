import { configUtils } from '../../../utils/config/config'

import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: 'show-model-usage',
  parameterDescription: 'on|off',
  description: '设置当前频道是否显示模型与 token 消耗',
  defaultValue: undefined,
  permissionGroups: ['admin'],
  withContext: false,
  async handler(event: ParseEventResultValid) {
    const channelId = event.originalEvent.target_id
    const value = (event.parameter || '').trim().toLowerCase()

    if (value === 'on') {
      await configUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        showModelTokenUsage: true,
      })
      respondToUser({
        originalEvent: event.originalEvent,
        content: '已开启：将显示模型与 token 消耗',
      })
      return
    }

    if (value === 'off') {
      await configUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        showModelTokenUsage: false,
      })
      respondToUser({
        originalEvent: event.originalEvent,
        content: '已关闭：不显示模型与 token 消耗',
      })
      return
    }

    const channelConfig = await configUtils.main.channelConfigs.getChannelConfig({ channelId })
    respondToUser({
      originalEvent: event.originalEvent,
      content:
        `当前 showModelTokenUsage=${channelConfig?.showModelTokenUsage ? 'on' : 'off'}。` +
        `\n用法: /show-model-usage on|off`,
    })
  },
} satisfies ChatDirectiveItem
