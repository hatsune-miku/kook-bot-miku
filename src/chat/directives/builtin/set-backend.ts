import { configUtils } from '../../../utils/config/config'
import { ChatBotBackend, ChatBotBackends } from '../../types'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: 'set_backend',
  parameterDescription: Object.values(ChatBotBackends).join('|'),
  description: `更换当前频道 AI 实现，可选范围：${Object.values(ChatBotBackends).join(', ')}`,
  defaultValue: undefined,
  permissionGroups: ['admin'],
  withContext: false,
  async handler(event: ParseEventResultValid) {
    const backend = event.parameter
    const channelId = event.originalEvent.target_id
    const channelName = event.originalEvent.extra.channel_name
    const channelConfig = await configUtils.main.channelConfigs.getChannelConfig({ channelId })

    if (
      [
        ChatBotBackends.gpt4,
        ChatBotBackends.gpt5,
        ChatBotBackends.gpt4o,
        ChatBotBackends.o1,
        ChatBotBackends.o1mini,
        ChatBotBackends.o3mini,
      ].includes(backend as any)
    ) {
      configUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        backend: backend as ChatBotBackend,
      })
      respondToUser({
        originalEvent: event.originalEvent,
        content: `已切换至 ChatGPT (${backend})`,
      })
      return
    }

    if (backend?.startsWith('deepseek')) {
      configUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        backend: backend as ChatBotBackend,
      })
      respondToUser({
        originalEvent: event.originalEvent,
        content: `已切换至 DeepSeek (${backend})`,
      })
      return
    }

    respondToUser({
      originalEvent: event.originalEvent,
      content: `当前频道: ${channelName} (${channelId}) 所用的模型是 ${
        channelConfig.backend
      }，可选: ${Object.values(ChatBotBackends).join(', ')}`,
    })
  },
} satisfies ChatDirectiveItem
