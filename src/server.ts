import express from 'express'
import { exit } from 'process'

import { deinitialize, main } from './bot'
import { info } from './utils/logging/logger'
import { initializeLarkBot } from './websocket/larksocket'

info('Server Startup')

const expressApp = express()
const port = 6309

expressApp.listen(port, async () => {
  await main()
  await initializeLarkBot()
  expressApp.use(express.json())
  info(`Server listening at http://localhost:${port}`)
})

process.on('SIGINT', () => {
  deinitialize()
  info('Server Shutdown')
  exit(0)
})
