import { kookUserStore } from '../../../cached-store/kook-user'
import { Events, RespondToUserParameters } from '../../../events'
import { CreateChannelMessageResult, KResponseExt } from '../../../utils/krequest/types'
import { KEvent, KTextChannelExtra } from '../../../websocket/kwebsocket/types'
import { ParseEventResult } from '../types'

export function respondToUser(params: RespondToUserParameters): Promise<KResponseExt<CreateChannelMessageResult>> {
  return new Promise((resolve) => {
    this.eventEmitter.emit(Events.RespondToUser, params, resolve)
  })
}

export function respondCardMessageToUser(
  params: RespondToUserParameters
): Promise<KResponseExt<CreateChannelMessageResult>> {
  return new Promise((resolve) => {
    this.eventEmitter.emit(Events.RespondCardMessageToUser, params, resolve)
  })
}

/**
 * 每条 Directive 消息形如下列之一：
 * - `@ChatBot /directive`
 * - `@ChatBot /directive @user`
 * - `@ChatBot /directive <parameter>`
 * - `@ChatBot /directive <parameter> @user`
 *
 * 不以 / 开头的消息，不是 Directives
 */
export async function tryParseEvent(
  extractedContent: string,
  event: KEvent<KTextChannelExtra>
): Promise<ParseEventResult> {
  if (!extractedContent.startsWith('/')) {
    return { shouldIntercept: false }
  }

  // Skip slash
  const [directive, ...parameter] = extractedContent
    .slice(1)
    .split(' ')
    .filter((part) => part.trim() !== '')

  if (directive === '') {
    return { shouldIntercept: false }
  }

  const user = await kookUserStore.getUser({ userId: event.author_id, guildId: event.extra?.guild_id })

  return {
    shouldIntercept: true,
    directive: directive,
    parameter: parameter.join(' '),
    mentionRoleIds: event.extra.mention_roles,
    mentionUserIds: event.extra.mention,
    originalEvent: event,
    userProperties: user,
  }
}
