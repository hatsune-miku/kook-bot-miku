import express from 'express'
import { exit } from 'process'

import { deinitializeKookBot, initializeKookBot } from './bot/index'
import { info } from './utils/logging/logger'

info('Server Startup')

const expressApp = express()
const port = 6309

expressApp.listen(port, async () => {
  await initializeKookBot()
  expressApp.use(express.json())
  info(`Server listening at http://localhost:${port}`)
})

process.on('SIGINT', () => {
  deinitializeKookBot()
  info('Server Shutdown')
  exit(0)
})
