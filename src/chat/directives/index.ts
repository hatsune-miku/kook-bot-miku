import { builtinDirectives } from './builtin'
import { ParseEventResultValid } from './types'
import { respondCardMessageToUser, respondToUser } from './utils/events'

import { isTrustedUser } from '../../utils'
import { warn } from '../../utils/logging/logger'

async function handleHelp(event: ParseEventResultValid) {
  const directives = [...builtinDirectives]
  const content = directives
    .map((directive) => {
      const triggerWords = Array.isArray(directive.triggerWord) ? directive.triggerWord : [directive.triggerWord]

      return [
        '指令: ' + triggerWords.join(' | '),
        '用法: ' + `@我 /<${triggerWords.join(' | ')}> ${directive.parameterDescription}`,
        '用途: ' + directive.description,
        '权限: ' + directive.permissionGroups.join(', '),
      ].join('\n')
    })
    .join('\n==========\n')

  return respondToUser({
    originalEvent: event.originalEvent,
    content: content,
  })
}

export async function dispatchDirectives(
  parsedEvent: ParseEventResultValid,
  onContextReady?: () => void
): Promise<boolean> {
  const { directive } = parsedEvent
  if (directive === 'help') {
    await handleHelp(parsedEvent)
    return true
  }

  const directiveItem = builtinDirectives.find((d) => d.triggerWord === directive)
  if (!directiveItem) {
    warn('Match failed', directiveItem, directive)
    return false
  }
  if (!directiveItem.permissionGroups.includes('everyone')) {
    if (!isTrustedUser(parsedEvent.userProperties.metadata.id)) {
      if (!parsedEvent.userProperties.roles.some((r) => directiveItem.permissionGroups.includes(r))) {
        respondToUser({
          originalEvent: parsedEvent.originalEvent,
          content: '权限不足，无法完成操作',
        })
        return true
      }
    }
  }

  await directiveItem.handler(parsedEvent, {
    respondToUser,
    respondCardMessageToUser,
    dispatchDirectives,
  })

  const withContext = directiveItem.withContext ?? true
  if (withContext) {
    onContextReady?.()
  }
  return true
}
