import type { OpenClawPluginApi } from 'openclaw/plugin-sdk'
import { emptyPluginConfigSchema } from 'openclaw/plugin-sdk'

import { createKookPlatformToolFactory } from './agent-tools'
import { kookPlugin } from './channel'
import { setKookRuntime } from './runtime'

const plugin = {
  id: 'openclaw-channel-kook',
  name: 'KOOK Channel',
  description: 'KOOK (formerly KaiHeiLa) messaging platform channel for OpenClaw',
  configSchema: emptyPluginConfigSchema(),

  register(api: OpenClawPluginApi) {
    setKookRuntime(api.runtime)
    api.registerChannel({ plugin: kookPlugin as any })
    api.registerTool(createKookPlatformToolFactory(), { name: 'kook_platform' })
  },
}

export default plugin
