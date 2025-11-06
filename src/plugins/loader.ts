import fs from 'fs'
import path from 'path'
import { map } from 'radash'

import { IKbmPlugin } from './types'

import { dispatchDirectives } from '../chat/directives'
import { respondCardMessageToUser, respondToUser } from '../chat/directives/utils/events'
import { CardBuilder } from '../helpers/card-helper'
import { getExternalPluginsPath } from '../utils/config/utils'
import { info, warn } from '../utils/logging/logger'

export class PluginLoader {
  private _plugins: IKbmPlugin[] = []

  async initialize() {
    const pluginsPath = getExternalPluginsPath()
    const directoryEntries = await fs.promises.readdir(pluginsPath, {
      withFileTypes: true,
      recursive: false,
    })

    const absolutePaths = directoryEntries
      .filter((entry) => {
        if (entry.isFile() && entry.name.toLowerCase().endsWith('.js')) {
          return true
        }
        if (!entry.isDirectory()) {
          return false
        }
        const indexFilePath = path.join(pluginsPath, entry.name, 'index.js')
        try {
          fs.accessSync(indexFilePath, fs.constants.F_OK)
          return true
        } catch (e) {
          warn(`Plugin ${entry.name} is not a valid plugin`, e)
          return false
        }
      })
      .map((entry) =>
        entry.isFile() ? path.join(pluginsPath, entry.name) : path.join(pluginsPath, entry.name, 'index.js')
      )

    const pluginModules = (await map(absolutePaths, async (p) => [p, await import(p)]))
      .map(([pluginPath, PluginClass]) => {
        try {
          return new PluginClass.default()
        } catch (e) {
          const fileName = path.basename(pluginPath)
          warn(`Failed to load plugin ${fileName}`, e)
          return null
        }
      })
      .filter(Boolean) as IKbmPlugin[]

    await map(pluginModules, async (p) => {
      info(`Loading plugin: ${p.name}`)
      if (!p.kbmPlugin) {
        warn(`Plugin ${p.name} is not a valid plugin`)
        return
      }

      if (p.onLoad) {
        const printLogMessage = (...args: any[]) => {
          info(`[Plugin/${p.name}]`, ...args)
        }

        await p.onLoad?.({
          dispatchDirectives,
          respondToUser,
          respondCardMessageToUser,
          printLogMessage,
          CardBuilder,
        })
      }
      info(`Plugin ${p.name} online`)
    })

    this._plugins = pluginModules.filter((p) => p.kbmPlugin)
  }

  async deinitialize() {
    this._plugins.map((p) => p.onUnload?.())
  }

  get plugins(): readonly IKbmPlugin[] {
    return this._plugins
  }
}

export const pluginLoader = new PluginLoader()
