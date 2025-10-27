import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { ChatCompletionTool } from 'openai/resources'
import { sleep } from 'radash'

import { createCodeBlock } from '../../../../backend/controllers/code'
import { info } from '../../../../utils/logging/logger'
import { ToolFunctionContext } from '../../context'
import { IFunctionTool } from '../dispatch'

export class EvaluatePythonTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<ChatCompletionTool> {
    return {
      type: 'function',
      function: {
        name: 'pythonEvalSandboxed',
        description:
          '执行一段 Python 3 程序，其解释器将运行于隔离环境，不会造成任何破坏，也可以安全放心地访问文件系统。必须显式使用 print 打印结果，不可以采用 interactive 风格写法。仅在你别无选择、必须通过外部调用来获取数据、LLM自身能力不足时才使用。',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description:
                '一个 Python 3 程序。必须显式使用 print 打印结果，不可以采用 interactive 风格写法。你可以假定各种库都已安装。',
            },
          },
          required: ['code'],
          additionalProperties: false,
        },
        strict: false,
      },
    }
  }
  async invoke(context: ToolFunctionContext, params: any): Promise<string> {
    info(`[Chat] Evaluate Python expression`, params)
    const { code, showCommand = true } = params

    if (showCommand && context.event?.extra?.guild_id && context.event?.target_id) {
      createCodeBlock({
        guildId: context.event.extra.guild_id,
        channelId: context.event.target_id,
        code: code,
        language: 'Python',
        markdownCodeLanguage: 'python',
      })
      await sleep(100)
    }

    try {
      writeFileSync('/tmp/eval.py', code)
      const result = execSync(`python3 /tmp/eval.py`, {
        encoding: 'utf-8',
      }).toString()
      info(`[Chat] Eval result`, result)
      return result
    } catch (e: any) {
      return `执行失败: ${e?.message || '未知错误'}`
    }
  }
}
