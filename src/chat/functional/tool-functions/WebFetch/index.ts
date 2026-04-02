import { FunctionTool } from 'openai/resources/responses/responses'

import { ToolFunctionContext } from '../../types'
import { IFunctionTool } from '../dispatch'

function stripHtml(content: string): string {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export class WebFetchTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<FunctionTool> {
    return {
      type: 'function',
      name: 'web_fetch',
      description: '获取网页文本内容，适合抓取公开网页并提取主要文本。',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '完整 URL，例如 https://example.com',
          },
          maxChars: {
            type: 'number',
            description: '返回最大字符数，默认 8000，最大 30000',
          },
        },
        required: ['url'],
        additionalProperties: false,
      },
      strict: false,
    }
  }

  async invoke(_context: ToolFunctionContext, params: any): Promise<string> {
    const url = String(params?.url || '').trim()
    if (!/^https?:\/\//i.test(url)) {
      return '调用失败：url 必须是 http(s) 开头的完整地址'
    }
    const maxChars = Math.max(500, Math.min(30000, Number(params?.maxChars || 8000)))

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'user-agent': 'kook-bot-miku/1.0',
          accept: 'text/html,application/json,text/plain,*/*',
        },
      })
      const contentType = response.headers.get('content-type') || ''
      const raw = await response.text()

      const text = /text\/html/i.test(contentType) ? stripHtml(raw) : raw
      return text.slice(0, maxChars)
    } catch (e: any) {
      return `调用失败：${e?.message || '网络错误'}`
    }
  }
}
