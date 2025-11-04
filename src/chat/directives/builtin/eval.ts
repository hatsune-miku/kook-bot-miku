import { RequestMethod, Requests } from '../../../utils/krequest/request'
import { error } from '../../../utils/logging/logger'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'
import { respondToUser } from '../utils/events'

export default {
  triggerWord: 'eval',
  parameterDescription: '<method> <endpoint> <...data>',
  description: '使用你给定的 JSON 数据，以我的名义调用接口，十分很危险',
  defaultValue: undefined,
  permissionGroups: ['admin'],
  async handler(event: ParseEventResultValid) {
    if (!event.parameter) {
      respondToUser({
        originalEvent: event.originalEvent,
        content: 'eval 内容不可为空~',
      })
      return
    }

    console.log(event.parameter)
    const parameters = event.parameter.split(' ')
    if (parameters.length < 3) {
      respondToUser({
        originalEvent: event.originalEvent,
        content: '参数解析失败~',
      })
      return
    }

    const method = parameters[0]
    const endpoint = parameters[1]
    const args = parameters.slice(2).join(' ').replace(/\\\\"/g, '\\"')
    let parsed: unknown

    try {
      parsed = JSON.parse(args)
    } catch {
      error('Failed to parse JSON', args)
      respondToUser({
        originalEvent: event.originalEvent,
        content: 'eval 内容解析失败~',
      })
      return
    }
    const result = await Requests.request(endpoint, method as RequestMethod, parsed as any)
    respondToUser({
      originalEvent: event.originalEvent,
      content: JSON.stringify(result),
    })
  },
} satisfies ChatDirectiveItem
