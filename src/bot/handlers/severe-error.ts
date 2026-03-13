import { pluginLoader } from '../../plugins/loader'
import { die } from '../../utils/server/die'

export function handleSevereError(message: string) {
  pluginLoader.plugins.map((p) => p.onSevereError?.(message))
  die(`A severe error occured and bot must exit: ${message}`)
}
