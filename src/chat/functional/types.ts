import { KEvent, KTextChannelExtra } from '../../websocket/kwebsocket/types'

export interface ToolFunctionContext {
  event: KEvent<KTextChannelExtra>
}
