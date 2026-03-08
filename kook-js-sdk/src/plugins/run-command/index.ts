import { execSync } from 'child_process'

import { KookPlugin, PluginContext } from '../../plugin/types'

/**
 * Linux 命令执行插件
 *
 * 提供 `/run` 指令，执行 Shell 命令
 */
export class RunCommandPlugin implements KookPlugin {
  name = 'run-command'
  description = '执行 Shell 命令'
  private context: PluginContext | null = null

  async onLoad(context: PluginContext): Promise<void> {
    this.context = context
  }

  providedDirectives = [
    {
      triggerWord: ['run', 'sh'],
      parameterDescription: '<Shell 命令>',
      description: '执行 Shell 命令并返回输出',
      permissionGroups: ['admin'],
      handler: async (context) => {
        const command = context.parameter
        if (!command) {
          return
        }

        let result: string
        try {
          result = execSync(command, { encoding: 'utf-8', timeout: 30000 })
        } catch (e: any) {
          result = `执行失败: ${e?.message ?? '未知错误'}`
        }

        const truncated = result.length > 2000 ? result.slice(0, 2000) + '\n...(truncated)' : result

        try {
          await this.context?.client.api.createMessage({
            type: 9,
            target_id: context.event.target_id,
            content: `\`\`\`\n${truncated}\n\`\`\``,
            quote: context.event.msg_id,
          })
        } catch {
          // API 调用失败，静默忽略
        }
      },
    },
  ]
}
