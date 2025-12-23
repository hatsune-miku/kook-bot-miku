export const ChatBotBackends = {
  gpt51: 'gpt-5.1',
  gpt52: 'gpt-5.2',
  gpt5t: 'gpt-5-thinking',
  deepseekv31volc: 'deepseek-v3-1-250821',
} as const

export type ChatBotBackend = (typeof ChatBotBackends)[keyof typeof ChatBotBackends]

export function isReasonerBackend(backend: ChatBotBackend) {
  return [ChatBotBackends.gpt5t, ChatBotBackends.gpt52, ChatBotBackends.gpt51].includes(backend as any)
}
