import { IFunctionTool } from 'src/chat/functional/tool-functions/dispatch'
import { ICardBuilderStatic } from 'src/helpers/types'

import { ChatDirectiveItem, ParseEventResultValid } from '../chat/directives/types'
import { RespondToUserParameters } from '../events'
import { KWSHelperOptions } from '../websocket/kwebsocket/kws-helper'

export interface IKbmPluginContext {
  dispatchDirectives: (event: ParseEventResultValid, onContextReady?: () => void) => Promise<boolean>
  respondToUser: (params: RespondToUserParameters) => void
  respondCardMessageToUser: (params: RespondToUserParameters) => void
  printLogMessage: (...args: any[]) => void
  CardBuilder: ICardBuilderStatic
}

export interface IKbmPluginLifeCycle extends Omit<KWSHelperOptions, 'autoReconnect'> {
  onLoad?: (context: IKbmPluginContext) => Promise<void>
  onUnload?: () => void
  onParsedTextChannelEvent?: (event: ParseEventResultValid) => Promise<void>
}

export interface IKbmPlugin extends IKbmPluginLifeCycle {
  kbmPlugin: true
  name: string
  description: string
  providedDirectives?: ChatDirectiveItem[]
  providedTools?: IFunctionTool[]
}
