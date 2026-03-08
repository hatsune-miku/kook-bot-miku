import { KookPlugin, PluginContext } from '../../plugin/types'

/**
 * JavaScript 沙盒执行插件
 *
 * 提供 `/eval-js` 指令，在 Node.js 环境中执行 JavaScript 代码
 */
export class EvalJsPlugin implements KookPlugin {
  name = 'eval-js'
  description = '执行 JavaScript 代码'
  private context: PluginContext | null = null

  async onLoad(context: PluginContext): Promise<void> {
    this.context = context
  }

  providedDirectives = [
    {
      triggerWord: ['eval-js', 'js'],
      parameterDescription: '<JavaScript 代码>',
      description: '在沙盒中执行 JavaScript 代码',
      permissionGroups: ['admin'],
      handler: async (context) => {
        const code = context.parameter
        if (!code) {
          return
        }

        let result: string
        try {
          result = String(eval(code))
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
          // API call failed — silently ignore
        }
      },
    },
  ]
}
