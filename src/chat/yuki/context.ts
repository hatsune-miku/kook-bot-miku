import { KUser } from '@kookapp/js-sdk'

import { ParseEventResultValid } from '../directives/types'

export interface YukiContext {
  guildId: string
  channelId: string
  author: KUser
  event: ParseEventResultValid
}
