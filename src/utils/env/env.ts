import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

import { die } from '../server/die'

export const Env: EnvType = {} as any

export type ChatProvider = 'openai' | 'google' | 'anthropic' | 'volcengine'

export interface ChatSupplierConfig {
  baseUrl?: string
  apiKey?: string
  matches?: string[]
}

export interface ChatProviderConfig {
  suppliers?: ChatSupplierConfig[]
}

export interface ChatDisableCapabilitiesConfig {
  vision?: ChatProvider[]
}

export interface EnvType {
  KOOKBaseUrl: string
  BotToken: string
  ProxyUrl?: string
  PublicArchivePath: string
  LogLevel: string
  DefaultChatModel: string
  ChatProviders: Partial<Record<ChatProvider, ChatProviderConfig>>
  ChatDisableCapabilities: ChatDisableCapabilitiesConfig
}

export function reloadConfig() {
  const configPath = path.resolve(process.cwd(), 'config.yaml')
  if (!fs.existsSync(configPath)) {
    die('环境配置错误：未找到 config.yaml，请复制 config.yaml.example 并填写')
  }

  const raw = fs.readFileSync(configPath, 'utf8')
  const parsed = (yaml.load(raw) || {}) as any
  const kook = parsed.kook || {}
  const runtime = parsed.runtime || {}
  const chat = parsed.chat || {}
  const rawKookBaseUrl = kook.baseUrl || die('环境配置错误：kook.baseUrl')
  const normalizedKookBaseUrl = String(rawKookBaseUrl).replace(/\/api\/v3\/?$/, '')

  Object.assign(Env, {
    KOOKBaseUrl: normalizedKookBaseUrl,
    BotToken: kook.botToken || die('环境配置错误：kook.botToken'),
    ProxyUrl: runtime.proxyUrl,
    PublicArchivePath: runtime.publicArchivePath || '',
    LogLevel: runtime.logLevel || 'info',
    DefaultChatModel: chat.defaultModel || '',
    ChatProviders: chat.providers || {},
    ChatDisableCapabilities: chat.disableCapabilities || {},
    raw: parsed,
  })
}

reloadConfig()
