import { ChatDirectiveItem, ParseEventResultValid } from '../chat/directives/types'
import { RespondToUserParameters } from '../events'
import { KWSHelperOptions } from '../websocket/kwebsocket/kws-helper'

export interface IKbmPluginContext {
  dispatchDirectives: (event: ParseEventResultValid, onContextReady?: () => void) => Promise<boolean>
  respondToUser: (params: RespondToUserParameters) => void
  respondCardMessageToUser: (params: RespondToUserParameters) => void
}

export interface IKbmPluginLifeCycle extends Omit<KWSHelperOptions, 'autoReconnect'> {
  onLoad?: (context: IKbmPluginContext) => Promise<void>
  onUnload?: () => void
  onParsedTextChannelEvent?: (event: ParseEventResultValid) => Promise<void>
}

export interface IKbmPlugin extends IKbmPluginLifeCycle {
  name: string
  description: string
  providedDirectives?: ChatDirectiveItem[]
}
