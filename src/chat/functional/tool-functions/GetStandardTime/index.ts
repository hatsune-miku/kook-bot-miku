import { FunctionTool } from 'openai/resources/responses/responses'

import { ToolFunctionContext } from '../../types'
import { IFunctionTool } from '../dispatch'

export class GetStandardTimeTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<FunctionTool> {
    return {
      type: 'function',
      name: 'getDateTime',
      description: '获取当前时间（北京时间）',
      parameters: {},
      strict: false,
    }
  }

  async invoke(context: ToolFunctionContext, params: any): Promise<string> {
    return new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    })
  }
}
