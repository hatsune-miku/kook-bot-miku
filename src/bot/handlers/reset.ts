import { botEventEmitter } from '../../events'
import { DisplayName } from '../../global/shared'
import { pluginLoader } from '../../plugins/loader'

export async function handleReset() {
  await Promise.all(pluginLoader.plugins.map((p) => p.onReset?.()))

  botEventEmitter.emit('send-lark-message', {
    title: `${DisplayName} Event`,
    message: 'Server: Reset',
  })
}
