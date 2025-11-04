import { createWriteStream } from 'fs'
import http from 'http'
import https from 'https'
import { ChatCompletionTool } from 'openai/resources'

import { DisplayName } from '../../../../global/shared'
import { CardBuilder, CardIcons } from '../../../../helpers/card-helper'
import { Requests } from '../../../../utils/krequest/request'
import { info } from '../../../../utils/logging/logger'
import { KEventType } from '../../../../websocket/kwebsocket/types'
import { respondCardMessageToUser } from '../../../directives/utils/events'
import { ToolFunctionContext } from '../../types'
import { IFunctionTool } from '../dispatch'

export class DownloadFileTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<ChatCompletionTool> {
    return {
      type: 'function',
      function: {
        name: 'downloadFile',
        description: '从给定URL直链中下载对应文件，并存到临时文件目录中。返回下载到的文件的绝对路径。',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: '文件URL',
            },
            fileName: {
              type: 'string',
              description: '为临时文件取一个名字',
            },
          },
          required: ['url', 'fileName'],
          additionalProperties: false,
        },
        strict: false,
      },
    }
  }

  async invoke(context: ToolFunctionContext, params: any): Promise<string> {
    const { url, fileName } = params || {}

    if (!url || !fileName) {
      return '错误的URL'
    }

    const {
      code,
      message,
      data: sendResult,
    } = await respondCardMessageToUser({
      originalEvent: context.event,
      content: CardBuilder.fromTemplate()
        .addIconWithKMarkdownText(CardIcons.IconHappy, `${DisplayName}收到了链接\n\n\`${url}\``)
        .build(),
    })

    if (code !== 0) {
      return `发送消息失败: ${message}`
    }

    const updateMessage = (iconUrl: string, content: string) => {
      Requests.updateChannelMessage(
        {
          msg_id: sendResult.msg_id,
          content: CardBuilder.fromTemplate().addIconWithKMarkdownText(iconUrl, content).build(),
          quote: context.event.msg_id,
          extra: {
            type: KEventType.KMarkdown,
            target_id: context.event.target_id,
          },
        },
        { guildId: context.event.extra.guild_id, originalTextContent: content }
      )
    }

    const targetPath = `/tmp/${fileName}`
    const stream = createWriteStream(targetPath)

    return new Promise<string>((resolve) => {
      const timeout = setTimeout(() => {
        updateMessage(CardIcons.IconCry, `下载文件超时了`)
        stream.close()
        resolve('下载文件超时')
      }, 60000)

      const impl = url.startsWith('https') ? https : http

      impl
        .get(url, (response) => {
          response.pipe(stream)

          stream.on('open', () => {
            updateMessage(CardIcons.IconCute, `${DisplayName}正在下载文件\n\n\`${url}\``)
          })
          stream.on('error', (e) => {
            clearTimeout(timeout)
            info(`[DownloadFile] Error`, e)
            updateMessage(CardIcons.IconCry, `下载文件失败了`)
            resolve('下载文件失败')
          })
          stream.on('finish', () => {
            clearTimeout(timeout)
            updateMessage(CardIcons.IconHappy, `${DisplayName}已收到文件\n\n\`${url}\``)
            resolve(targetPath)
          })
        })
        .on('error', (e) => {
          info(`[DownloadFile] Error`, e)
          updateMessage(CardIcons.IconCry, `下载文件失败了`)
          resolve('下载文件失败')
        })
    })
  }
}
