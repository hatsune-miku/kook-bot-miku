import { readFile } from 'fs/promises'

import { KookPlugin, PluginContext } from '../../plugin/types'
import { CardBuilder } from '../../helpers/card-builder'
import { KEventTypes } from '../../types'

/**
 * 文件发送插件
 *
 * 提供 `/send-file` 指令，将本地文件上传并发送
 */
export class SendFilePlugin implements KookPlugin {
  name = 'send-file'
  description = '上传并发送本地文件'
  private context: PluginContext | null = null

  async onLoad(context: PluginContext): Promise<void> {
    this.context = context
  }

  providedDirectives = [
    {
      triggerWord: 'send-file',
      parameterDescription: '<本地文件路径> [文件名]',
      description: '上传本地文件并发送到频道',
      permissionGroups: ['admin'],
      handler: async (context) => {
        const parts = (context.parameter ?? '').split(' ')
        const filePath = parts[0]
        const fileName = parts[1] ?? filePath.split('/').pop() ?? 'file'

        if (!filePath) {
          return
        }

        const client = this.context?.client
        if (!client) {
          return
        }

        try {
          const fileData = new Blob([await readFile(filePath)])
          const formData = new FormData()
          formData.append('file', fileData, fileName)

          const uploadResult = await client.api.uploadAsset(formData)
          if (!uploadResult.success) {
            return
          }

          const card = CardBuilder.fromTemplate()
            .addFile(fileName, uploadResult.data.url, fileData.size)
            .build()

          await client.api.createMessage({
            type: KEventTypes.Card,
            target_id: context.event.target_id,
            content: card,
          })
        } catch {
          // readFile or API call failed — silently ignore
        }
      },
    },
  ]
}
