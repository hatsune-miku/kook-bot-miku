import { CardBuilder, CardIcons } from '../../../helpers/card-helper'
import { configUtils } from '../../../utils/config/config'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondCardMessageToUser } from '../utils/events'

export default {
  triggerWord: ['new', 'clear', 'obliviate', 'delete-context'],
  parameterDescription: '',
  description: '遗忘当前服务器的当前频道对应的上下文',
  defaultValue: undefined,
  permissionGroups: ['admin'],
  withContext: false,
  async handler(event: ParseEventResultValid) {
    const guildId = event.originalEvent.extra.guild_id
    const channelId = event.originalEvent.target_id
    await respondCardMessageToUser({
      originalEvent: event.originalEvent,
      content: CardBuilder.fromTemplate().addIconWithKMarkdownText(CardIcons.IconCute, `已清除上下文`).build(),
    })
    await configUtils.main.contextUnits.clearContextUnits({ guildId, channelId })
  },
} satisfies ChatDirectiveItem
