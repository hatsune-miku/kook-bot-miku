import fs from 'fs'
import path from 'path'

import { IKbmPlugin } from './types'

import { dispatchDirectives } from '../chat/directives'
import { respondCardMessageToUser, respondToUser } from '../chat/directives/utils/events'
import { getExternalPluginsPath } from '../utils/config/utils'

export class PluginLoader {
  private _plugins: IKbmPlugin[] = []

  async initialize() {
    const pluginsPath = getExternalPluginsPath()
    const directoryEntries = await fs.promises.readdir(pluginsPath, {
      withFileTypes: true,
      recursive: false,
    })

    const filteredDirectoryEntries = directoryEntries.filter((entry) => {
      if (entry.isDirectory()) {
        return false
      }
      if (!entry.isFile()) {
        return false
      }
      return entry.name.toLowerCase().endsWith('.js')
    })

    const absolutePaths = filteredDirectoryEntries.map((entry) => path.join(pluginsPath, entry.name))
    const pluginModules = (await Promise.all(absolutePaths.map((path) => import(path)))) as IKbmPlugin[]

    await Promise.all(
      pluginModules.map((p) =>
        p.onLoad?.({
          dispatchDirectives,
          respondToUser,
          respondCardMessageToUser,
        })
      )
    )

    this._plugins = pluginModules
  }

  async deinitialize() {
    this._plugins.map((p) => p.onUnload?.())
  }

  get plugins(): readonly IKbmPlugin[] {
    return this._plugins
  }
}

export const pluginLoader = new PluginLoader()
