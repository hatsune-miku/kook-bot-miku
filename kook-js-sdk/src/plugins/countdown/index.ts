import { KookPlugin } from '../../plugin/types'
import { CardBuilder } from '../../helpers/card-builder'
import { KEventTypes } from '../../types'

/**
 * 倒计时插件
 *
 * 提供 `/countdown` 指令，设置一个卡片倒计时
 */
export class SetCountdownPlugin implements KookPlugin {
  name = 'countdown'
  description = '设置倒计时卡片消息'

  providedDirectives = [
    {
      triggerWord: ['countdown', 'cd'],
      parameterDescription: '<秒数>',
      description: '设置一个倒计时',
      permissionGroups: ['everyone'],
      handler: async (context) => {
        const seconds = parseInt(context.parameter ?? '60', 10)
        if (isNaN(seconds) || seconds <= 0) {
          return
        }

        const endAt = Date.now() + seconds * 1000
        const card = CardBuilder.fromTemplate().addHourCountDown(endAt).build()

        try {
          await context['_client']?.api.createMessage({
            type: KEventTypes.Card,
            target_id: context.event.target_id,
            content: card,
          })
        } catch {
          // API 调用失败，静默忽略
        }
      },
    },
  ]
}
