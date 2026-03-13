import { KEvent, KTextChannelExtra } from '@kookapp/js-sdk'

export interface ToolFunctionContext {
  event: KEvent<KTextChannelExtra>
  onMessage: (message: string) => void
}
