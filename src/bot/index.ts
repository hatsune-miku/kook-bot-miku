import { initializeBotEvents } from './handlers/bot-events'
import { handleReset } from './handlers/reset'
import { handleSevereError } from './handlers/severe-error'
import { handleSystemEvent } from './handlers/system-event'
import { handleTextChannelEvent } from './handlers/text-channel-event'

import { botKookUserStore } from '../cached-store/bot-kook-user'
import { pluginLoader } from '../plugins/loader'
import { configUtils } from '../utils/config/config'
import { info } from '../utils/logging/logger'
import { KWSHelper } from '../websocket/kwebsocket/kws-helper'

export async function initializeKookBot() {
  info('Initializing configs and database...')
  await configUtils.initialize()

  info('Initializing cached stores...')
  await botKookUserStore.initialize()

  info('Initializing plugins...')
  await pluginLoader.initialize()

  info('Registering bot events...')
  initializeBotEvents()

  info('Starting websocket...')
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
  pluginLoader.deinitialize()
  info('Deinitialization OK')
}
