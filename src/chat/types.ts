export const ChatBotBackends = {
  gpt52: 'gpt-5.2',
  gpt5t: 'gpt-5-thinking',
  deepseekv31volc: 'deepseek-v3-1-250821',
} as const

export type ChatBotBackend = (typeof ChatBotBackends)[keyof typeof ChatBotBackends]

export function isReasonerBackend(backend: ChatBotBackend) {
  return [ChatBotBackends.gpt5t, ChatBotBackends.gpt52].includes(backend as any)
}
