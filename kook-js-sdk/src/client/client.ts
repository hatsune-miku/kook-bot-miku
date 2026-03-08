import { KookClientConfig } from './types'

import { DirectiveDispatcher, DirectiveDispatcherConfig } from '../directive/dispatcher'
import { DirectiveItem } from '../directive/types'
import { DirectiveRegistry } from '../directive/registry'
import { RestClient } from '../http/rest-client'
import { KookPlugin } from '../plugin/types'
import { PluginLoader } from '../plugin/loader'
import { KSelfUser } from '../types/user'
import { createLogger, Logger } from '../utils/logger'
import { WsClient } from '../ws/ws-client'
import { WsClientEventMap, WsClientEventName } from '../ws/ws-events'

/**
 * KOOK 客户端
 *
 * 统一入口，组合 RestClient、WsClient、指令系统和插件系统
 *
 * @example
 * ```ts
 * const client = new KookClient({ botToken: 'your-bot-token' })
 * client.on('textChannelEvent', (event) => {
 *   console.log('Received:', event.content)
 * })
 * await client.connect()
 * ```
 */
export class KookClient {
  /**
   * REST API 客户端
   */
  readonly api: RestClient

  /**
   * WebSocket 客户端（高级用法）
   */
  readonly ws: WsClient

  /**
   * 指令注册表
   */
  readonly directives: DirectiveRegistry

  /**
   * 插件加载器
   */
  readonly plugins: PluginLoader

  private logger: Logger
  private _me: KSelfUser | null = null
  private _dispatcher: DirectiveDispatcher | null = null

  constructor(config: KookClientConfig) {
    this.logger = config.logger ?? createLogger({ prefix: 'kook-client' })

    this.api = new RestClient({
      token: config.botToken,
      baseUrl: config.baseUrl,
      logger: this.logger,
    })

    this.ws = new WsClient({
      restClient: this.api,
      compression: config.compression,
      autoReconnect: config.autoReconnect,
      timing: config.timing,
      logger: this.logger,
    })

    this.directives = new DirectiveRegistry()
    this.plugins = new PluginLoader(this.logger)

    this.ws.on('reset', () => this.handleReset())
  }

  private handleReset(): void {
    for (const plugin of this.plugins.plugins) {
      try {
        plugin.onReset?.()
      } catch (e) {
        this.logger.error(`Plugin ${plugin.name} onReset failed:`, e)
      }
    }
  }

  /**
   * 连接到 KOOK（获取 Bot 信息 + 建立 WebSocket 连接）
   */
  async connect(): Promise<void> {
    const result = await this.api.getSelfUser()
    if (result.success) {
      this._me = result.data
      this.logger.info(`Bot logged in as ${this._me.username} (${this._me.id})`)
    } else {
      this.logger.warn('Failed to get bot info:', result.message)
    }

    this.ws.connect()
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.plugins.unloadAll()
    this.ws.disconnect()
  }

  /**
   * 注册事件监听器
   */
  on<E extends WsClientEventName>(event: E, listener: (...args: WsClientEventMap[E]) => void): this {
    this.ws.on(event, listener)
    return this
  }

  /**
   * 移除事件监听器
   */
  off<E extends WsClientEventName>(event: E, listener: (...args: WsClientEventMap[E]) => void): this {
    this.ws.off(event, listener)
    return this
  }

  /**
   * 注册指令（便捷方法）
   */
  registerDirective(item: DirectiveItem): this {
    this.directives.register(item)
    return this
  }

  /**
   * 加载插件（便捷方法）
   */
  async use(plugin: KookPlugin): Promise<this> {
    await this.plugins.load(plugin, this)
    return this
  }

  /**
   * 创建指令分发器
   */
  createDispatcher(config?: Partial<DirectiveDispatcherConfig>): DirectiveDispatcher {
    this._dispatcher = new DirectiveDispatcher({
      registry: this.directives,
      logger: this.logger,
      ...config,
    })
    return this._dispatcher
  }

  /**
   * 获取已创建的分发器
   */
  get dispatcher(): DirectiveDispatcher | null {
    return this._dispatcher
  }

  /**
   * 缓存的 Bot 用户信息
   */
  get me(): KSelfUser | null {
    return this._me
  }
}
