import { KookClient } from '../client/client'
import { DirectiveItem } from '../directive/types'
import { KEvent, KSystemEventExtra, KTextChannelExtra } from '../types'

/**
 * KOOK 插件接口
 */
export interface KookPlugin {
  name: string
  description: string
  onLoad?: (context: PluginContext) => Promise<void>
  onUnload?: () => void
  onReset?: () => Promise<void>
  onEvent?: (event: KEvent<unknown>, sn?: number) => Promise<void>
  onTextChannelEvent?: (event: KEvent<KTextChannelExtra>, sn?: number) => Promise<void>
  onSystemEvent?: (event: KEvent<KSystemEventExtra>, sn?: number) => Promise<void>
  providedDirectives?: DirectiveItem[]
}

/**
 * 插件上下文（传入 onLoad）
 */
export interface PluginContext {
  client: KookClient
  logger: PluginLogger
}

/**
 * 插件专属 Logger
 */
export interface PluginLogger {
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
  debug(...args: any[]): void
}
