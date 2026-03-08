import { KEvent } from '../types/event'
import { KSystemEventExtra } from '../types/system-event'
import { KTextChannelExtra } from '../types/channel'
import { KWSState } from '../types/ws'

/**
 * WsClient 事件映射
 */
export interface WsClientEventMap {
  event: [event: KEvent<unknown>, sn: number | undefined]
  textChannelEvent: [event: KEvent<KTextChannelExtra>, sn: number | undefined]
  systemEvent: [event: KEvent<KSystemEventExtra>, sn: number | undefined]
  stateChange: [newState: KWSState, oldState: KWSState]
  error: [error: Error | string]
  open: []
  close: []
  reset: []
}

export type WsClientEventName = keyof WsClientEventMap
