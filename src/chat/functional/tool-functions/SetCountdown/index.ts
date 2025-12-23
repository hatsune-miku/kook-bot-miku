import { FunctionTool } from 'openai/resources/responses/responses'

import { CardBuilder } from '../../../../helpers/card-helper'
import { respondCardMessageToUser } from '../../../directives/utils/events'
import { ToolFunctionContext } from '../../types'
import { IFunctionTool } from '../dispatch'

export class SetCountdownTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<FunctionTool> {
    return {
      type: 'function',
      name: 'setCountdown',
      description: '设置一个倒计时',
      parameters: {
        type: 'object',
        properties: {
          time: {
            type: 'number',
            description: '倒计时间隔，单位为毫秒',
          },
        },
        required: ['time'],
        additionalProperties: false,
      },
      strict: false,
    }
  }

  async invoke(context: ToolFunctionContext, params: any): Promise<string> {
    const { time } = params

    const endAt = Date.now() + time
    const card = CardBuilder.fromTemplate().addHourCountDown(endAt).build()
    respondCardMessageToUser({
      originalEvent: context.event,
      content: card,
    })
    return 'OK'
  }
}
