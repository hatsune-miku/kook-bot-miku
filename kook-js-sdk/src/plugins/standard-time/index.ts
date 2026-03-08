import { KookPlugin, PluginContext } from '../../plugin/types'

/**
 * 标准时间插件
 *
 * 提供 `/time` 指令，返回当前北京时间
 */
export class StandardTimePlugin implements KookPlugin {
  name = 'standard-time'
  description = '获取当前标准时间（北京时间）'
  private context: PluginContext | null = null

  async onLoad(context: PluginContext): Promise<void> {
    this.context = context
  }

  providedDirectives = [
    {
      triggerWord: ['time', 'now'],
      parameterDescription: '',
      description: '获取当前北京时间',
      permissionGroups: ['everyone'],
      handler: async (context) => {
        const time = new Date().toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
        })

        try {
          await this.context?.client.api.createMessage({
            type: 9,
            target_id: context.event.target_id,
            content: `当前时间：${time}`,
            quote: context.event.msg_id,
          })
        } catch {
          // API 调用失败，静默忽略
        }
      },
    },
  ]
}
