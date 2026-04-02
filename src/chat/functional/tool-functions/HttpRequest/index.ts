import { FunctionTool } from 'openai/resources/responses/responses'

import { ToolFunctionContext } from '../../types'
import { IFunctionTool } from '../dispatch'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export class HttpRequestTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<FunctionTool> {
    return {
      type: 'function',
      name: 'http_request',
      description: '发起通用 HTTP 请求（JSON 接口），用于调用第三方 API。',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '完整 URL' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
          headers: {
            type: 'object',
            description: '请求头对象',
            additionalProperties: true,
          },
          query: {
            type: 'object',
            description: 'query 参数对象',
            additionalProperties: true,
          },
          body: {
            type: 'object',
            description: 'JSON 请求体',
            additionalProperties: true,
          },
        },
        required: ['url'],
        additionalProperties: false,
      },
      strict: false,
    }
  }

  async invoke(_context: ToolFunctionContext, params: any): Promise<string> {
    const urlInput = String(params?.url || '').trim()
    if (!/^https?:\/\//i.test(urlInput)) {
      return '调用失败：url 必须是 http(s) 开头的完整地址'
    }
    const method = String(params?.method || 'GET').toUpperCase() as Method
    const query = params?.query || {}
    const body = params?.body || undefined
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(params?.headers || {}),
    }

    const url = new URL(urlInput)
    Object.keys(query).forEach((k) => {
      const v = query[k]
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v))
      }
    })

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: method === 'GET' ? undefined : body ? JSON.stringify(body) : undefined,
      })
      const text = await response.text()
      const payload = text.length > 12000 ? text.slice(0, 12000) + '...' : text
      return JSON.stringify({
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        body: payload,
      })
    } catch (e: any) {
      return `调用失败：${e?.message || '网络错误'}`
    }
  }
}
