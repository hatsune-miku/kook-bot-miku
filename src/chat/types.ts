export interface ContextUnit {
  id: string
  messageId: string
  role: 'assistant' | 'user'
  name: string
  content: string
  timestamp: number
  freeChat: boolean
}

export enum GroupChatStrategy {
  Off = 'off',
  Legacy = 'legacy',
  Normal = 'normal',
}

export enum ChatBotBackend {
  GPT4o = 'gpt-4o',
  GPT4Turbo = 'gpt-4-turbo',
  GPT4 = 'gpt-4',
  GPT5 = 'gpt-5',
  O1 = 'o1',
  O1Mini = 'o1-mini',
  O3Mini = 'o3-mini',
  DeepSeekV3 = 'deepseek-chat',
  DeepSeekR1 = 'deepseek-reasoner',
  DeepSeekV31Volc = 'deepseek-v3-1-250821',
}
