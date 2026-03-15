import { configUtils } from '../../../utils/config/config'
import { ChatBotBackends } from '../../types'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondToUser } from '../utils/events'

const backendKeys = Object.keys(ChatBotBackends)

export default {
  triggerWord: 'set-backend',
  parameterDescription: backendKeys.join('|'),
  description: `更换当前频道 AI 实现，可选范围：${backendKeys.join(', ')}`,
  defaultValue: undefined,
  permissionGroups: ['admin'],
  withContext: false,
  async handler(event: ParseEventResultValid) {
    const backend = event.parameter
    const channelId = event.originalEvent.target_id
    const channelName = event.originalEvent.extra.channel_name
    const channelConfig = await configUtils.main.channelConfigs.getChannelConfig({ channelId })

    if (backend && backend in ChatBotBackends) {
      configUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        backend,
      })
      respondToUser({
        originalEvent: event.originalEvent,
        content: `已切换至 ${backend}`,
      })
    } else {
      respondToUser({
        originalEvent: event.originalEvent,
        content: `当前频道: ${channelName} (${channelId}) 所用的模型是 ${
          channelConfig.backend
        }，可选: ${backendKeys.join(', ')}`,
      })
    }
  },
} satisfies ChatDirectiveItem
