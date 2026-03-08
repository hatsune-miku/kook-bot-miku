import { createWriteStream } from 'fs'
import http from 'http'
import https from 'https'

import { KookPlugin, PluginContext } from '../../plugin/types'

/**
 * 文件下载插件
 *
 * 提供 `/download` 指令，从 URL 下载文件到临时目录
 */
export class DownloadFilePlugin implements KookPlugin {
  name = 'download-file'
  description = '从 URL 下载文件'
  private context: PluginContext | null = null

  async onLoad(context: PluginContext): Promise<void> {
    this.context = context
  }

  providedDirectives = [
    {
      triggerWord: 'download',
      parameterDescription: '<URL> [文件名]',
      description: '从 URL 下载文件到临时目录',
      permissionGroups: ['admin'],
      handler: async (context) => {
        try {
          const parts = (context.parameter ?? '').split(' ')
          const url = parts[0]
          const fileName = parts[1] ?? 'download'

          if (!url) {
            return
          }

          const targetPath = `/tmp/${fileName}`

          try {
            await this.context?.client.api.createMessage({
              type: 9,
              target_id: context.event.target_id,
              content: `正在下载: ${url}`,
              quote: context.event.msg_id,
            })
          } catch {
            // API 调用失败，静默忽略
          }

          const stream = createWriteStream(targetPath)
          const impl = url.startsWith('https') ? https : http

          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              stream.close()
              resolve()
            }, 60000)

            impl
              .get(url, (response) => {
                response.pipe(stream)
                stream.on('finish', () => {
                  clearTimeout(timeout)
                  try {
                    this.context?.client.api.createMessage({
                      type: 9,
                      target_id: context.event.target_id,
                      content: `下载完成: ${targetPath}`,
                    })
                  } catch {
                    // 静默忽略
                  }
                  resolve()
                })
                stream.on('error', () => {
                  clearTimeout(timeout)
                  resolve()
                })
              })
              .on('error', () => {
                clearTimeout(timeout)
                resolve()
              })
          })
        } catch {
          // 创建写入流或其他错误，静默忽略
        }
      },
    },
  ]
}
