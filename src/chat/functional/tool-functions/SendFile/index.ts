import { FunctionTool } from 'openai/resources/responses/responses'

import { CardBuilder } from '../../../../helpers/card-helper'
import { Requests } from '../../../../utils/krequest/request'
import { respondCardMessageToUser } from '../../../directives/utils/events'
import { ToolFunctionContext } from '../../types'
import { IFunctionTool } from '../dispatch'

export class SendFileTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<FunctionTool> {
    return {
      type: 'function',
      name: 'sendFile',
      description: `
        从本地路径发送文件给用户。
        
        - 不要将用户发来的文件，原封不动又发回去。
        - 你应当只用这个函数来发送经过你处理后的文件。
        `,
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '文件本地绝对路径',
          },
          fileName: {
            type: 'string',
            description: '取个文件名',
          },
        },
        required: ['path', 'fileName'],
        additionalProperties: false,
      },
      strict: false,
    }
  }

  async invoke(context: ToolFunctionContext, params: any): Promise<string> {
    const { path, fileName } = params || {}
    if (!path || !fileName) {
      return '错误的本地文件路径'
    }

    const [url, size] = await Requests.uploadFile(path)
    if (!url) {
      return '文件上传失败'
    }

    const guildId = context.event.extra?.guild_id
    const channelId = context.event.target_id
    if (!guildId || !channelId) {
      return '无法获取服务器ID或频道ID'
    }

    respondCardMessageToUser({
      originalEvent: context.event,
      content: CardBuilder.fromTemplate().addFile(fileName, url, size).build(),
    })
    return '已调用 sendFile 将文件发送给了用户'
  }
}
