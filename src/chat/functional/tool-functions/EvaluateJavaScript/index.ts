import { FunctionTool } from 'openai/resources/responses/responses'

import { ToolFunctionContext } from '../../types'
import { IFunctionTool } from '../dispatch'

export class EvaluateJavaScriptTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<FunctionTool> {
    return {
      type: 'function',
      name: 'javaScriptEvalSandboxed',
      description: `运行一段 JavaScript 程序。它将运行于隔离的node环境，不会造成任何破坏、也可以安全放心地访问文件系统，或是运行任何 Linux 命令。只在有需要时使用。仅在你别无选择、必须通过外部调用来获取数据、LLM自身能力不足时才使用。`,
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '一个合法的 JavaScript 程序，支持 ES6 语法，环境为 Node.js',
          },
        },
        required: ['expression'],
        additionalProperties: false,
      },
      strict: false,
    }
  }
  async invoke(context: ToolFunctionContext, params: any): Promise<string> {
    const { expression, showCommand: _ = true } = params

    // if (showCommand && context.event?.extra?.guild_id && context.event?.target_id) {
    //   createCodeBlock({
    //     guildId: context.event.extra.guild_id,
    //     channelId: context.event.target_id,
    //     code: expression,
    //     language: 'JavaScript',
    //     markdownCodeLanguage: 'js',
    //   })
    //   await sleep(100)
    // }

    try {
      context.onMessage(' <已执行 JavaScript 代码> ')
      // eslint-disable-next-line no-eval
      const result = eval(expression)
      return result
    } catch (e: any) {
      return `执行失败: ${e?.message || '未知错误'}`
    }
  }
}
