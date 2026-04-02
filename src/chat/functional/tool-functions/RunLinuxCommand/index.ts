import { execSync } from 'child_process'
import { FunctionTool } from 'openai/resources/responses/responses'

import { ToolFunctionContext } from '../../types'
import { IFunctionTool } from '../dispatch'

export class RunLinuxCommandTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<FunctionTool> {
    return {
      type: 'function',
      name: 'runLinuxCommand',
      description: '运行一个单行 Linux 命令。可以是任何合法命令甚至是危险命令，这些总是运行在安全的沙盒环境中。',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '一个 Linux (Bash) 命令。你可假设任何工具都已安装。',
          },
        },
        required: ['expression'],
        additionalProperties: false,
      },
      strict: false,
    }
  }

  async invoke(context: ToolFunctionContext, params: any): Promise<string> {
    const { expression } = params
    try {
      return execSync(expression).toString()
    } catch (e: any) {
      return '命令执行失败，错误信息：' + (e?.message || 'unknown')
    }
  }
}
