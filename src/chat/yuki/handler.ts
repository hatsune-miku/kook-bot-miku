import { YukiContext } from './context'
import YukiCommandSession from './session'
import { parseDirectiveInvocation } from './utils'

import { info, warn } from '../../utils/logging/logger'
import { IChatDirectivesManager, ParseEventResultValid } from '../directives/types'

export default function yukiSubCommandHandler(manager: IChatDirectivesManager, event: ParseEventResultValid) {
  const invocation = parseDirectiveInvocation(event.parameter)
  if (!invocation) {
    warn('[yuki] No invocation found', event.parameter)
    return
  }

  const context: YukiContext = {
    guildId: event.originalEvent.extra.guild_id,
    channelId: event.originalEvent.target_id,
    author: event.userProperties.metadata,
    event: event,
  }

  info('[yuki] creating session', invocation)
  const session = new YukiCommandSession(manager, invocation, context)
  session.interpretInvocation()
}
