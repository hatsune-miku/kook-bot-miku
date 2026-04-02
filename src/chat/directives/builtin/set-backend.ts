import { configUtils } from '../../../utils/config/config'
import { ChatProviders, DefaultChatProvider, normalizeBackendInput } from '../../types'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondToUser } from '../utils/events'

const providerKeys = Object.keys(ChatProviders)

export default {
  triggerWord: ['set-backend', 'model', 'switch'],
  parameterDescription: '<model>@<provider>',
  description: `更换当前频道 AI 实现。格式: model@provider（provider 自动小写）。已配置 provider: ${providerKeys.join(', ')}`,
  defaultValue: undefined,
  permissionGroups: ['admin'],
  withContext: false,
  async handler(event: ParseEventResultValid) {
    const backend = normalizeBackendInput(event.parameter || '')
    const channelId = event.originalEvent.target_id
    const channelName = event.originalEvent.extra.channel_name
    const channelConfig = await configUtils.main.channelConfigs.getChannelConfig({ channelId })

    if (backend) {
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
        content:
          `当前频道: ${channelName} (${channelId}) 所用模型标识是 ${channelConfig.backend}。` +
          `\n输入格式: /set-backend model@provider` +
          `\n例如: /set-backend gpt-5.3@${DefaultChatProvider}` +
          `\n已配置 provider: ${providerKeys.join(', ')}`,
      })
    }
  },
} satisfies ChatDirectiveItem
