export const ChatBotBackends = {
  gpt52: 'gpt-5.2',
  gpt53: 'gpt-5.3',
  gpt54: 'gpt-5.4',
  gemini3flash: 'gemini-3-flash-preview',
  gemini3pro: 'gemini-3-pro-preview',
  deepseekv31volc: 'deepseek-v3-1-250821',
  hidden: 'hidden',
} as const

export type ChatBotBackend = (typeof ChatBotBackends)[keyof typeof ChatBotBackends]

export function isReasonerBackend(backend: ChatBotBackend) {
  return [
    ChatBotBackends.gpt52,
    ChatBotBackends.gpt53,
    ChatBotBackends.gpt54,
    ChatBotBackends.gemini3flash,
    ChatBotBackends.gemini3pro,
  ].includes(backend as any)
}
