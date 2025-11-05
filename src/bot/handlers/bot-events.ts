import { Events, RespondToUserParameters, botEventEmitter } from '../../events'
import { displayNameFromUser } from '../../utils'
import { Requests } from '../../utils/krequest/request'
import { CreateChannelMessageResult, KResponseExt } from '../../utils/krequest/types'
import { error } from '../../utils/logging/logger'
import { KEventType } from '../../websocket/kwebsocket/types'

export function initializeBotEvents() {
  botEventEmitter.on(Events.RespondToUser, handleRespondToUserEvent)
  botEventEmitter.on(Events.RespondCardMessageToUser, handleRespondCardMessageToUserEvent)
}

async function handleRespondToUserEvent(
  event: RespondToUserParameters,
  callback?: (result: KResponseExt<CreateChannelMessageResult>) => void
) {
  const result = await Requests.createChannelMessage(
    {
      type: KEventType.KMarkdown,
      target_id: event.originalEvent.target_id,
      content: event.content,
      quote: event.originalEvent.msg_id,
    },
    event.withContext
  )

  callback?.(result)
  if (!result.success) {
    error('Failed to respond to', displayNameFromUser(event.originalEvent.extra.author), 'reason:', result.message)
  }
}

async function handleRespondCardMessageToUserEvent(
  event: RespondToUserParameters,
  callback?: (result: KResponseExt<CreateChannelMessageResult>) => void
) {
  const result = await Requests.createChannelMessage(
    {
      type: KEventType.Card,
      target_id: event.originalEvent.target_id,
      content: event.content,
      quote: event.originalEvent.msg_id,
    },
    event.withContext
  )

  callback?.(result)
  if (!result.success) {
    error('Failed to respond to', displayNameFromUser(event.originalEvent.extra.author), 'reason:', result.message)
  }
}
