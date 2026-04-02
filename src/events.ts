import { EventEmitter } from 'node:events'

import { KEvent, KTextChannelExtra } from '@kookapp/js-sdk'

export const Events = {
  RespondToUser: 'respond-to-user',
  RespondCardMessageToUser: 'respond-card-message-to-user',
}

export interface RespondToUserParameters {
  originalEvent: KEvent<KTextChannelExtra>
  content: string
  withContext?: {
    guildId: string
    originalTextContent: string
  }
}

export const botEventEmitter = new EventEmitter()
