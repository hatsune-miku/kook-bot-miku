import { ConfigUtils } from '../../../utils/config/config'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: 'print_context',
  parameterDescription: '',
  description: '(调试限定) 输出当前频道的对话上下文',
  defaultValue: undefined,
  permissionGroups: ['developer'],
  withContext: false,
  async handler(event: ParseEventResultValid) {
    const guildId = event.originalEvent.extra.guild_id
    const channelId = event.originalEvent.target_id
    const contextUnits = await ConfigUtils.main.contextUnits.getContextUnits({ guildId, channelId })

    if (contextUnits.length === 0) {
      respondToUser({
        originalEvent: event.originalEvent,
        content: '当前频道的对话上下文为空~',
      })
      return
    }

    respondToUser({
      originalEvent: event.originalEvent,
      content: contextUnits
        .map(
          (unit) =>
            `${unit.authorName} (${unit.authorUserId}): ${unit.content.length > 32 ? unit.content.slice(0, 32) + '...' : unit.content}`
        )
        .join('\n'),
    })
  },
} satisfies ChatDirectiveItem
