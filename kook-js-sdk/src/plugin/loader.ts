import { KookPlugin, PluginContext } from './types'

import { KookClient } from '../client/client'
import { createLogger, Logger } from '../utils/logger'

/**
 * 插件加载器
 *
 * 管理插件的加载、卸载和生命周期
 */
export class PluginLoader {
  private _plugins: KookPlugin[] = []
  private logger: Logger

  constructor(logger?: Logger) {
    this.logger = logger ?? createLogger({ prefix: 'kook-plugins' })
  }

  /**
   * 加载一个插件
   */
  async load(plugin: KookPlugin, client: KookClient): Promise<void> {
    this.logger.info(`Loading plugin: ${plugin.name}`)

    if (plugin.providedDirectives) {
      for (const directive of plugin.providedDirectives) {
        client['directiveRegistry']?.register(directive)
      }
    }

    if (plugin.onLoad) {
      const context: PluginContext = {
        client,
        logger: {
          info: (...args) => this.logger.info(`[${plugin.name}]`, ...args),
          warn: (...args) => this.logger.warn(`[${plugin.name}]`, ...args),
          error: (...args) => this.logger.error(`[${plugin.name}]`, ...args),
          debug: (...args) => this.logger.debug(`[${plugin.name}]`, ...args),
        },
      }
      try {
        await plugin.onLoad(context)
      } catch (e) {
        this.logger.error(`Plugin ${plugin.name} onLoad failed:`, e)
      }
    }

    this._plugins.push(plugin)
    this.logger.info(`Plugin loaded: ${plugin.name}`)
  }

  /**
   * 卸载所有插件
   */
  unloadAll(): void {
    for (const plugin of this._plugins) {
      this.logger.info(`Unloading plugin: ${plugin.name}`)
      try {
        plugin.onUnload?.()
      } catch (e) {
        this.logger.error(`Plugin ${plugin.name} onUnload failed:`, e)
      }
    }
    this._plugins = []
  }

  /**
   * 卸载指定插件
   */
  unload(name: string): void {
    const index = this._plugins.findIndex((p) => p.name === name)
    if (index !== -1) {
      const plugin = this._plugins[index]
      this.logger.info(`Unloading plugin: ${plugin.name}`)
      try {
        plugin.onUnload?.()
      } catch (e) {
        this.logger.error(`Plugin ${plugin.name} onUnload failed:`, e)
      }
      this._plugins.splice(index, 1)
    }
  }

  /**
   * 已加载的插件列表
   */
  get plugins(): readonly KookPlugin[] {
    return this._plugins
  }
}
