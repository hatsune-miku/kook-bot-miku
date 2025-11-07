import { BotKookUserStore } from '../cached-store/bot-kook-user'
import { KookUserStore } from '../cached-store/kook-user'
import { ChatDirectiveItem, ParseEventResultValid } from '../chat/directives/types'
import { IFunctionTool } from '../chat/functional/tool-functions/dispatch'
import { RespondToUserParameters } from '../events'
import { CardIcons } from '../helpers/card-helper'
import { ICardBuilderStatic } from '../helpers/types'
import { ConfigUtils } from '../utils/config/config'
import { Env } from '../utils/env/env'
import { Requests } from '../utils/krequest/request'
import { KWSHelperOptions } from '../websocket/kwebsocket/kws-helper'

export interface IKbmPluginContext {
  dispatchDirectives: (event: ParseEventResultValid, onContextReady?: () => void) => Promise<boolean>
  respondToUser: (params: RespondToUserParameters) => void
  respondCardMessageToUser: (params: RespondToUserParameters) => void
  printLogMessage: (...args: any[]) => void
  CardBuilder: ICardBuilderStatic
  CardIcons: typeof CardIcons
  Requests: typeof Requests
  Env: typeof Env
  DisplayName: string
  configUtils: ConfigUtils
  botKookUserStore: BotKookUserStore
  kookUserStore: KookUserStore
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
