import { botEventEmitter } from '../../events'
import { DisplayName } from '../../global/shared'

export function handleReset() {
  botEventEmitter.emit('send-lark-message', {
    title: `${DisplayName} Event`,
    message: 'Server: Reset',
  })
}
