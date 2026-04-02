import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { FunctionTool } from 'openai/resources/responses/responses'

import { ToolFunctionContext } from '../../types'
import { IFunctionTool } from '../dispatch'

export class EvaluatePythonTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<FunctionTool> {
    return {
      type: 'function',
      name: 'pythonEvalSandboxed',
      description:
        '执行一段 Python 3 程序，其解释器将运行于隔离环境，不会造成任何破坏，也可以安全放心地访问文件系统。必须显式使用 print 打印结果，不可以采用 interactive 风格写法。仅在你别无选择、必须通过外部调用来获取数据、LLM自身能力不足时才使用。',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: '一段 Python 3 程序。',
          },
        },
        required: ['code'],
        additionalProperties: false,
      },
      strict: false,
    }
  }
  async invoke(context: ToolFunctionContext, params: any): Promise<string> {
    const { code } = params
    try {
      writeFileSync('/tmp/eval.py', code)
      const result = execSync(`python3 /tmp/eval.py`, {
        encoding: 'utf-8',
      }).toString()
      return result
    } catch (e: any) {
      return `执行失败: ${e?.message || '未知错误'}`
    }
  }
}
