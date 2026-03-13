import { KookClient } from '@kookapp/js-sdk'

import { initializeBotEvents } from './handlers/bot-events'
import { handleReset } from './handlers/reset'
import { handleSevereError } from './handlers/severe-error'
import { handleSystemEvent } from './handlers/system-event'
import { handleTextChannelEvent } from './handlers/text-channel-event'

import { botKookUserStore } from '../cached-store/bot-kook-user'
import { pluginLoader } from '../plugins/loader'
import { configUtils } from '../utils/config/config'
import { Env, reloadConfig } from '../utils/env/env'
import { info } from '../utils/logging/logger'

reloadConfig()

export const client = new KookClient({
  botToken: Env.BotToken,
  baseUrl: Env.KOOKBaseUrl,
  autoReconnect: true,
})

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
  client.on('textChannelEvent', handleTextChannelEvent)
  client.on('systemEvent', handleSystemEvent)
  client.on('reset', handleReset)
  client.on('error', (err) => handleSevereError(String(err)))
  await client.connect()

  info('Initialization OK')
}

export function deinitializeKookBot() {
  pluginLoader.deinitialize()
  client.disconnect()
  info('Deinitialization OK')
}
