import { RespondToUserParameters } from '../../events'
import { KEvent, KTextChannelExtra, KUser } from '../../websocket/kwebsocket/types'

export type ParseEventResult = ParseEventResultDontIntercept | ParseEventResultValid

export interface ParseEventResultDontIntercept {
  shouldIntercept: false
}

export interface ParseEventResultValid {
  shouldIntercept: true
  directive: string
  parameter: string | undefined
  mentionRoleIds: number[]
  mentionUserIds: string[]
  originalEvent: KEvent<KTextChannelExtra>
  userProperties: UserProperties
}

export interface UserProperties {
  roles: string[]
  metadata: KUser
}

export interface ChatDirectiveHandler {
  (parsedEvent: ParseEventResultValid, manager: IChatDirectivesManager): Promise<void>
}

export interface ChatDirectiveItem {
  triggerWord: string | string[]
  parameterDescription: string
  description: string
  defaultValue: string | undefined
  permissionGroups: string[]
  handler: ChatDirectiveHandler
  withContext?: boolean
}

export interface IChatDirectivesManager {
  respondToUser(params: RespondToUserParameters): void
  respondCardMessageToUser(params: RespondToUserParameters): void
  dispatchDirectives(parsedEvent: ParseEventResultValid): Promise<boolean>
}
