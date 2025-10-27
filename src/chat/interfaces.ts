import { ParseEventResultValid } from './directives'

import { RespondToUserParameters } from '../events'

export interface IChatDirectivesManager {
  respondToUser(params: RespondToUserParameters): void
  respondCardMessageToUser(params: RespondToUserParameters): void
  dispatchDirectives(parsedEvent: ParseEventResultValid): boolean
}
