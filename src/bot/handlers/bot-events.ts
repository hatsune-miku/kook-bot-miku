import { KEventTypes } from '@kookapp/js-sdk'

import { Events, RespondToUserParameters, botEventEmitter } from '../../events'
import { displayNameFromUser } from '../../utils'
import { Requests } from '../../utils/krequest/request'
import { CreateChannelMessageResult, KResponseExt } from '../../utils/krequest/types'
import { error } from '../../utils/logging/logger'

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
      type: KEventTypes.KMarkdown,
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
      type: KEventTypes.Card,
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
