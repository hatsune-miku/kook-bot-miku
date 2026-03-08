import { Logger } from '../utils/logger'
import { WsTimingConfig } from '../types/ws'

/**
 * KookClient 配置
 */
export interface KookClientConfig {
  /**
   * Bot Token
   *
   * 获取方式：
   * 1. 前往 KOOK 开发者平台 https://developer.kookapp.cn/
   * 2. 创建或选择一个应用
   * 3. 在「机器人」页面，找到「Token」字段并复制
   */
  botToken: string

  /**
   * KOOK API base URL
   * @default 'https://www.kookapp.cn'
   */
  baseUrl?: string

  /**
   * 是否启用 WebSocket 压缩
   * @default true
   */
  compression?: boolean

  /**
   * 是否自动重连
   * @default true
   */
  autoReconnect?: boolean

  /**
   * WebSocket 定时配置
   */
  timing?: Partial<WsTimingConfig>

  /**
   * 自定义 Logger
   */
  logger?: Logger
}
