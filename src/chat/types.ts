export const ChatBotBackends = {
  gpt4o: 'gpt-4o',
  gpt4: 'gpt-4',
  gpt5: 'gpt-5',
  o1: 'o1',
  o1mini: 'o1-mini',
  o3mini: 'o3-mini',
  deepseekv3: 'deepseek-chat',
  deepseekr1: 'deepseek-reasoner',
  deepseekv31volc: 'deepseek-v3-1-250821',
} as const

export type ChatBotBackend = (typeof ChatBotBackends)[keyof typeof ChatBotBackends]
