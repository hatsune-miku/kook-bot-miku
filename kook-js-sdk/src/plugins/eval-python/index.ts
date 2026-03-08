import { execSync } from 'child_process'
import { writeFileSync } from 'fs'

import { KookPlugin, PluginContext } from '../../plugin/types'

/**
 * Python 执行插件
 *
 * 提供 `/eval-py` 指令，执行 Python 3 代码
 */
export class EvalPythonPlugin implements KookPlugin {
  name = 'eval-python'
  description = '执行 Python 3 代码'
  private context: PluginContext | null = null

  async onLoad(context: PluginContext): Promise<void> {
    this.context = context
  }

  providedDirectives = [
    {
      triggerWord: ['eval-py', 'py'],
      parameterDescription: '<Python 代码>',
      description: '执行 Python 3 代码',
      permissionGroups: ['admin'],
      handler: async (context) => {
        const code = context.parameter
        if (!code) {
          return
        }

        let result: string
        try {
          writeFileSync('/tmp/eval.py', code)
          result = execSync('python3 /tmp/eval.py', { encoding: 'utf-8' })
        } catch (e: any) {
          result = `执行失败: ${e?.message ?? '未知错误'}`
        }

        try {
          await this.context?.client.api.createMessage({
            type: 9,
            target_id: context.event.target_id,
            content: `\`\`\`\n${result}\n\`\`\``,
            quote: context.event.msg_id,
          })
        } catch {
          // API 调用失败，静默忽略
        }
      },
    },
  ]
}
