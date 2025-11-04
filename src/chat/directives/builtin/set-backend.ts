import { ConfigUtils } from '../../../utils/config/config'
import { ChatBotBackend, ChatBotBackends } from '../../types'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'

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
    const channelConfig = await ConfigUtils.main.channelConfigs.getChannelConfig({ channelId })
    const currentBackend = channelConfig?.backend

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
      ConfigUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        backend: backend as ChatBotBackend,
      })
      this.respondToUser({
        originalEvent: event.originalEvent,
        content: `已切换至 ChatGPT (${backend})`,
      })
      return
    }

    if (backend?.startsWith('deepseek')) {
      ConfigUtils.main.channelConfigs.updateChannelConfig({
        channelId,
        backend: backend as ChatBotBackend,
      })
      this.respondToUser({
        originalEvent: event.originalEvent,
        content: `已切换至 DeepSeek (${backend})`,
      })
      return
    }

    this.respondToUser({
      originalEvent: event.originalEvent,
      content: `当前频道: ${channelName} (${channelId}) 所用的模型是 ${
        channelConfig.backend
      }，可选: ${Object.values(ChatBotBackends).join(', ')}`,
    })
  },
} satisfies ChatDirectiveItem
