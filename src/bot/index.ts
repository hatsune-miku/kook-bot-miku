import { initializeBotEvents } from './handlers/bot-events'
import { handleReset } from './handlers/reset'
import { handleSevereError } from './handlers/severe-error'
import { handleSystemEvent } from './handlers/system-event'
import { handleTextChannelEvent } from './handlers/text-channel-event'

import { botKookUserStore } from '../cached-store/bot-kook-user'
import { configUtils } from '../utils/config/config'
import { info } from '../utils/logging/logger'
import { KWSHelper } from '../websocket/kwebsocket/kws-helper'

export async function initializeKookBot() {
  await configUtils.initialize()
  await botKookUserStore.initialize()
  initializeBotEvents()

  const helper = new KWSHelper({
    onSevereError: handleSevereError,
    onTextChannelEvent: handleTextChannelEvent,
    onSystemEvent: handleSystemEvent,
    onReset: handleReset,
    autoReconnect: true,
  })
  helper.startWebsocket()

  info('Initialization OK')
}

export function deinitializeKookBot() {
  info('Deinitialization OK')
}
