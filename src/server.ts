import express from 'express'
import { exit } from 'process'

import { deinitializeKookBot, initializeKookBot } from './bot/index'
import { Env } from './utils/env/env'
import { info } from './utils/logging/logger'
import { initializeLarkBot } from './websocket/larksocket'

info('Server Startup')

const expressApp = express()
const port = 6309

expressApp.listen(port, async () => {
  await initializeKookBot()
  if (Env.LarkBotEnable) {
    await initializeLarkBot()
  }
  expressApp.use(express.json())
  info(`Server listening at http://localhost:${port}`)
})

process.on('SIGINT', () => {
  deinitializeKookBot()
  info('Server Shutdown')
  exit(0)
})
