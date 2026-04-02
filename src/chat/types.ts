import { ChatProvider, Env } from '../utils/env/env'
import { die } from '../utils/server/die'

export interface BackendCapabilities {
  vision: boolean
}

export interface Backend {
  provider: ChatProvider
  suppliers: {
    baseUrl: string
    apiKey: string
    matches: string[]
  }[]
  capabilities: BackendCapabilities
}

export interface BackendSelection {
  provider: ChatProvider
  model: string
  backend: Backend
}

function buildProviders(): Record<ChatProvider, Backend> {
  const providers: Partial<Record<ChatProvider, Backend>> = {}
  const source = Env.ChatProviders || {}
  const disableVisionProviders = (Env.ChatDisableCapabilities?.vision || []).map((p) => String(p).toLowerCase())
  for (const providerName of Object.keys(source) as ChatProvider[]) {
    const config = source[providerName]
    if (!config) {
      continue
    }
    const suppliers =
      config.suppliers
        ?.map((s) => ({
          baseUrl: s.baseUrl || '',
          apiKey: s.apiKey || '',
          matches: (Array.isArray(s.matches) ? s.matches : []).map((m) => String(m).toLowerCase()),
        }))
        .filter((s) => s.apiKey.length > 0) || []

    providers[providerName] = {
      provider: providerName,
      suppliers,
      capabilities: {
        vision: !disableVisionProviders.includes(providerName),
      },
    }
  }
  return providers as Record<ChatProvider, Backend>
}

export const ChatProviders: Record<ChatProvider, Backend> = buildProviders()
const firstAvailableProvider = (Object.keys(ChatProviders)[0] || '') as ChatProvider

export const DefaultChatProvider =
  firstAvailableProvider || die('环境配置错误：chat.providers 不能为空')

export function normalizeBackendInput(input: string): string {
  const raw = (input || '').trim()
  const atIndex = raw.lastIndexOf('@')
  if (atIndex <= 0 || atIndex === raw.length - 1) {
    return raw
  }
  const model = raw.slice(0, atIndex).trim()
  const provider = raw.slice(atIndex + 1).trim().toLowerCase()
  return `${model}@${provider}`
}

export function resolveBackendSelection(input: string): BackendSelection {
  const raw = ((input || '').trim() || (Env.DefaultChatModel || '').trim()).trim()
  if (!raw) {
    throw new Error('模型标识为空，请先在 config.yaml 中设置 chat.defaultModel 或使用 /set-backend <model>@<provider>')
  }

  const atIndex = raw.lastIndexOf('@')
  if (atIndex <= 0 || atIndex === raw.length - 1) {
    throw new Error('模型标识格式错误，请使用 /set-backend <model>@<provider>')
  }

  const model = raw.slice(0, atIndex).trim()
  const provider = raw.slice(atIndex + 1).trim().toLowerCase() as ChatProvider
  const backend = ChatProviders[provider]

  if (!backend) {
    throw new Error(`未配置 provider: ${provider}`)
  }
  if (!backend.suppliers.length) {
    throw new Error(`provider ${provider} 未配置可用 suppliers`)
  }

  const normalizedModel = model.toLowerCase()
  const matchedSuppliers = backend.suppliers.filter((supplier) =>
    supplier.matches.some((matcher) => normalizedModel.includes(matcher))
  )

  if (matchedSuppliers.length === 0) {
    throw new Error(`provider ${provider} 下没有匹配模型 "${model}" 的 supplier`)
  }
  if (matchedSuppliers.length > 1) {
    const matchers = matchedSuppliers.map((s) => s.matches.join('|')).join(', ')
    throw new Error(`provider ${provider} 下匹配到多个 supplier（${matchers}），请调整 matches 规则`)
  }

  return {
    provider,
    model,
    backend: {
      ...backend,
      suppliers: [matchedSuppliers[0]],
    },
  }
}
