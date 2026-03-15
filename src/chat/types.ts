import { Env } from '../utils/env/env'

export type Provider = 'openai' | 'volcengine' | 'google' | 'hidden'

export interface Backend {
  provider: Provider
  name: string
  baseUrl: string
  apiKeys: string[]
}

export const ChatBotBackends: Record<string, Backend> = {
  'gpt-5.2': {
    provider: 'openai',
    name: 'ChatGPT',
    baseUrl: Env.OpenAIBaseUrl || '',
    apiKeys: Env.OpenAIKeys,
  },
  'gpt-5.3': {
    provider: 'openai',
    name: 'ChatGPT',
    baseUrl: Env.OpenAIBaseUrl || '',
    apiKeys: Env.OpenAIKeys,
  },
  'gpt-5.4': {
    provider: 'openai',
    name: 'ChatGPT',
    baseUrl: Env.OpenAIBaseUrl || '',
    apiKeys: Env.OpenAIKeys,
  },
  'gemini-3-flash-preview': {
    provider: 'google',
    name: 'Google Gemini',
    baseUrl: (Env.GoogleGeminiBaseUrl || '').replace(/\/v1$/, '').replace(/\/v1beta$/, ''),
    apiKeys: Env.GoogleGeminiKeys,
  },
  'gemini-3-pro-preview': {
    provider: 'google',
    name: 'Google Gemini',
    baseUrl: (Env.GoogleGeminiBaseUrl || '').replace(/\/v1$/, '').replace(/\/v1beta$/, ''),
    apiKeys: Env.GoogleGeminiKeys,
  },
  'deepseek-v3-1-250821': {
    provider: 'volcengine',
    name: 'DeepSeek',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKeys: Env.VolcKeys,
  },
  hidden: {
    provider: 'hidden',
    name: 'Hidden',
    baseUrl: '',
    apiKeys: [],
  },
}
