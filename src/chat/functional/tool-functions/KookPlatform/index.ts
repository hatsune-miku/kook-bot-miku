import { FunctionTool } from 'openai/resources/responses/responses'

import { Requests, RequestMethod } from '../../../../utils/krequest/request'

import { ToolFunctionContext } from '../../types'
import { IFunctionTool } from '../dispatch'

type KookPlatformAction = 'query_self' | 'query_user' | 'raw_request'

export class KookPlatformTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<FunctionTool> {
    return {
      type: 'function',
      name: 'kook_platform',
      description: '访问 KOOK 开发者平台 API（查自己信息、查用户、原始请求）',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['query_self', 'query_user', 'raw_request'],
            description: '要执行的 KOOK 平台动作',
          },
          userId: {
            type: 'string',
            description: 'query_user 时使用的目标用户 ID',
          },
          guildId: {
            type: 'string',
            description: 'query_user 时可选的服务器 ID',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE'],
            description: 'raw_request 时使用的 HTTP 方法',
          },
          path: {
            type: 'string',
            description: 'raw_request 时使用的路径（例如 /api/v3/user/me）',
          },
          query: {
            type: 'object',
            description: 'raw_request 的 query 参数对象',
            additionalProperties: true,
          },
          body: {
            type: 'object',
            description: 'raw_request 的请求体对象',
            additionalProperties: true,
          },
        },
        required: ['action'],
        additionalProperties: false,
      },
      strict: false,
    }
  }

  async invoke(_context: ToolFunctionContext, params: any): Promise<string> {
    const action = params?.action as KookPlatformAction
    switch (action) {
      case 'query_self': {
        const result = await Requests.querySelfUser()
        return JSON.stringify(result)
      }
      case 'query_user': {
        const userId = String(params?.userId || '').trim()
        if (!userId) {
          return '调用失败：query_user 需要 userId'
        }
        const guildId = String(params?.guildId || '').trim()
        const result = await Requests.queryUser({
          user_id: userId,
          ...(guildId ? { guild_id: guildId } : {}),
        } as any)
        return JSON.stringify(result)
      }
      case 'raw_request': {
        const method = String(params?.method || 'GET').toUpperCase() as RequestMethod
        const path = String(params?.path || '').trim()
        if (!path.startsWith('/api/v3/')) {
          return '调用失败：raw_request 的 path 必须以 /api/v3/ 开头'
        }
        const query = params?.query || {}
        const body = params?.body || {}
        const data = method === 'GET' ? query : body
        const result = await Requests.request<any>(path, method, data)
        return JSON.stringify(result)
      }
      default:
        return `调用失败：未知 action ${action}`
    }
  }
}
