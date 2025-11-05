import { DateTime } from 'luxon'

import { CardBuilder, CardIcons } from '../../../helpers/card-helper'
import { configUtils } from '../../../utils/config/config'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondCardMessageToUser, respondToUser } from '../utils/events'

export default {
  triggerWord: ['print-context', 'recall'],
  parameterDescription: '',
  description: '(调试限定) 输出当前频道的对话上下文',
  defaultValue: undefined,
  permissionGroups: ['developer'],
  withContext: false,
  async handler(event: ParseEventResultValid) {
    const guildId = event.originalEvent.extra.guild_id
    const channelId = event.originalEvent.target_id
    const contextUnits = await configUtils.main.contextUnits.getContextUnits({ guildId, channelId })

    if (contextUnits.length === 0) {
      respondToUser({
        originalEvent: event.originalEvent,
        content: '当前频道的对话上下文为空~',
      })
      return
    }

    const card = CardBuilder.fromTemplate().addIconWithKMarkdownText(CardIcons.IconHappy, '上下文数据！')

    contextUnits.forEach((unit) => {
      const dateTime = DateTime.fromMillis(unit.createdAt).toFormat('yyyy/MM/dd HH:mm:ss')
      const authorName = unit.authorName
      let content = unit.content

      if (content.length > 32) {
        content = `${content.slice(0, 32)}...`
      }

      card.addDivider().addContext(`${authorName} ${dateTime}`).addKMarkdownText(content)
    })

    respondCardMessageToUser({
      originalEvent: event.originalEvent,
      content: card.build(),
    })
  },
} satisfies ChatDirectiveItem
