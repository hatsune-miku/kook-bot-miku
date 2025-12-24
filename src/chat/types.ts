export const ChatBotBackends = {
  gpt51: 'gpt-5.1',
  gpt52: 'gpt-5.2',
  gpt5t: 'gpt-5-thinking',
  gemini3flash: 'gemini-3-flash-preview',
  gemini3pro: 'gemini-3-pro-preview',
  deepseekv31volc: 'deepseek-v3-1-250821',
  hidden: 'hidden',
} as const

export type ChatBotBackend = (typeof ChatBotBackends)[keyof typeof ChatBotBackends]

export function isReasonerBackend(backend: ChatBotBackend) {
  return [
    ChatBotBackends.gpt5t,
    ChatBotBackends.gpt52,
    ChatBotBackends.gpt51,
    ChatBotBackends.gemini3flash,
    ChatBotBackends.gemini3pro,
  ].includes(backend as any)
}
