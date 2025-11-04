import { ChatCompletionTool } from 'openai/resources'

import { queryRealtimeWeatherByKeyword } from './weather'

import { info } from '../../../../utils/logging/logger'
import { ToolFunctionContext } from '../../types'
import { IFunctionTool } from '../dispatch'

export class QWeatherTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<ChatCompletionTool> {
    return {
      type: 'function',
      function: {
        name: 'getRealtimeWeather',
        description: '获取实时天气',
        parameters: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: '城市名',
            },
          },
          required: ['city'],
          additionalProperties: false,
        },
        strict: false,
      },
    }
  }

  async invoke(context: ToolFunctionContext, params: any): Promise<string> {
    try {
      info(`[Chat] Get realtime weather`, params)
      const result = await queryRealtimeWeatherByKeyword(params.city)
      return JSON.stringify(result)
    } catch (e: any) {
      return `获取天气信息失败: ${e?.message || '未知错误'}`
    }
  }
}
