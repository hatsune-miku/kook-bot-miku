import { CardBuilder, CardIcons } from '../../../helpers/card-helper'
import { pluginLoader } from '../../../plugins/loader'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondCardMessageToUser } from '../utils/events'

export default {
  triggerWord: 'reload-plugins',
  parameterDescription: '',
  description: '重新加载所有插件',
  defaultValue: undefined,
  permissionGroups: ['admin'],
  async handler(event: ParseEventResultValid) {
    const sizeBefore = pluginLoader.plugins.length
    pluginLoader.deinitialize()
    await pluginLoader.initialize()
    const sizeAfter = pluginLoader.plugins.length

    respondCardMessageToUser({
      originalEvent: event.originalEvent,
      content: CardBuilder.fromTemplate()
        .addIconWithKMarkdownText(
          CardIcons.IconHappy,
          `插件已重新加载。已卸载 ${sizeBefore} 个插件、已加载 ${sizeAfter} 个插件。`
        )
        .build(),
    })
  },
} satisfies ChatDirectiveItem
