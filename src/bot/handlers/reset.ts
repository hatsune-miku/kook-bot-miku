import { pluginLoader } from '../../plugins/loader'

export async function handleReset() {
  await Promise.all(pluginLoader.plugins.map((p) => p.onReset?.()))
}
