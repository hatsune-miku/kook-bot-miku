import { extractRateLimitHeader, RateLimiter } from './rate-limiter'

import {
  AddReactionProps,
  CreateAssetResult,
  CreateChannelProps,
  CreateDirectMessageProps,
  CreateGuildRoleProps,
  CreateMessageProps,
  CreateMessageResult,
  CreateUserChatProps,
  DeleteChannelProps,
  DeleteDirectMessageProps,
  DeleteGuildRoleProps,
  DeleteMessageProps,
  DeleteReactionProps,
  DeleteUserChatProps,
  DirectMessageReactionProps,
  GetUserProps,
  GrantRevokeRoleProps,
  KGatewayResult,
  KResponse,
  KResponseExt,
  KSelfUser,
  KUserDetail,
  KickoutGuildMemberProps,
  ListChannelProps,
  ListDirectMessageProps,
  ListGuildMemberProps,
  ListGuildProps,
  ListGuildRoleProps,
  ListMessageProps,
  ListUserChatProps,
  MoveUserProps,
  OpenGatewayProps,
  PaginatedData,
  RequestMethod,
  SetGuildNicknameProps,
  UpdateDirectMessageProps,
  UpdateGuildRoleProps,
  UpdateMessageProps,
  ViewChannelProps,
  ViewGuildProps,
  ViewMessageProps,
  ViewUserChatProps,
} from '../types'
import { createLogger, Logger } from '../utils/logger'
import { queryFromObject } from '../utils/query'

/**
 * RestClient 配置
 */
export interface RestClientConfig {
  token: string
  baseUrl?: string
  logger?: Logger
}

/**
 * KOOK REST API 客户端
 *
 * 封装 KOOK 的 HTTP API，提供类型安全的调用方式和自动限速管理
 */
export class RestClient {
  private token: string
  private baseUrl: string
  private rateLimiter: RateLimiter
  private logger: Logger

  constructor(config: RestClientConfig) {
    this.token = config.token
    this.baseUrl = config.baseUrl ?? 'https://www.kookapp.cn'
    this.rateLimiter = new RateLimiter()
    this.logger = config.logger ?? createLogger({ prefix: 'kook-rest' })
  }

  /**
   * 核心 HTTP 请求方法
   */
  async request<T>(url: string, method: RequestMethod, data?: any, formData = false): Promise<KResponseExt<T>> {
    const bucket = url.replace('/api/v3/', '')

    const rateLimitReason = this.rateLimiter.check(bucket)
    if (rateLimitReason) {
      return fail(429, rateLimitReason)
    }

    const headers: Record<string, string> = {
      Authorization: `Bot ${this.token}`,
    }
    if (!formData) {
      headers['Content-type'] = 'application/json'
    }

    const requestInit: RequestInit = {
      headers,
      method,
    }

    let fullUrl = this.baseUrl + url
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      if (method === 'POST' && formData) {
        requestInit.body = data
      } else {
        try {
          requestInit.body = JSON.stringify(data ?? {})
        } catch {
          return fail(1145, 'Failed to serialize request body')
        }
      }
    } else if (data) {
      fullUrl += '?' + queryFromObject(data)
    }

    let responseText: string
    let responseObject: KResponse<T>

    try {
      const response = await fetch(fullUrl, requestInit)
      responseText = await response.text()

      const rateLimitHeader = extractRateLimitHeader(response.headers)
      if (rateLimitHeader) {
        this.rateLimiter.update(bucket, rateLimitHeader)

        if (rateLimitHeader.rateLimit.didTriggeredGlobalRateLimit) {
          return fail(429, 'Global rate limit reached')
        }
      }

      if (response.status !== 200) {
        return failureFromStatusCode(response.status)
      }
    } catch (e) {
      this.logger.error('Network error:', e)
      return fail(1145, 'Network error')
    }

    try {
      responseObject = JSON.parse(responseText)
    } catch {
      this.logger.error('Invalid JSON response')
      return fail(1145, 'Invalid JSON response')
    }

    return { success: responseObject.code === 0, ...responseObject }
  }

  // --- Gateway ---

  async openGateway(props: OpenGatewayProps): Promise<KResponseExt<KGatewayResult>> {
    const queryParams: Record<string, any> = {
      compress: props.compress ? 1 : 0,
    }

    if (props.fromDisconnect) {
      queryParams.resume = 1
      queryParams.sn = props.lastProcessedSn
      queryParams.session_id = props.lastSessionId
    }

    return this.request('/api/v3/gateway/index', 'GET', queryParams)
  }

  // --- Message ---

  async createMessage(props: CreateMessageProps): Promise<KResponseExt<CreateMessageResult>> {
    return this.request('/api/v3/message/create', 'POST', props)
  }

  async updateMessage(props: UpdateMessageProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/message/update', 'POST', props)
  }

  async deleteMessage(props: DeleteMessageProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/message/delete', 'POST', props)
  }

  async addReaction(props: AddReactionProps): Promise<KResponseExt<[]>> {
    return this.request('/api/v3/message/add-reaction', 'POST', props)
  }

  async deleteReaction(props: DeleteReactionProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/message/delete-reaction', 'POST', props)
  }

  async listMessages(props: ListMessageProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/message/list', 'GET', props)
  }

  async viewMessage(props: ViewMessageProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/message/view', 'GET', props)
  }

  // --- Asset ---

  async uploadAsset(formData: FormData): Promise<KResponseExt<CreateAssetResult>> {
    return this.request('/api/v3/asset/create', 'POST', formData, true)
  }

  // --- User ---

  async getSelfUser(): Promise<KResponseExt<KSelfUser>> {
    return this.request('/api/v3/user/me', 'GET')
  }

  async getUser(props: GetUserProps): Promise<KResponseExt<KUserDetail>> {
    return this.request('/api/v3/user/view', 'GET', props)
  }

  // --- Guild ---

  async listGuilds(props: ListGuildProps = {}): Promise<KResponseExt<PaginatedData<any>>> {
    return this.request('/api/v3/guild/list', 'GET', props)
  }

  async viewGuild(props: ViewGuildProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/guild/view', 'GET', props)
  }

  async listGuildMembers(props: ListGuildMemberProps): Promise<KResponseExt<PaginatedData<any>>> {
    return this.request('/api/v3/guild/user-list', 'GET', props)
  }

  async setGuildNickname(props: SetGuildNicknameProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/guild/nickname', 'POST', props)
  }

  async leaveGuild(guildId: string): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/guild/leave', 'POST', { guild_id: guildId })
  }

  async kickoutGuildMember(props: KickoutGuildMemberProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/guild/kickout', 'POST', props)
  }

  // --- Channel ---

  async listChannels(props: ListChannelProps): Promise<KResponseExt<PaginatedData<any>>> {
    return this.request('/api/v3/channel/list', 'GET', props)
  }

  async viewChannel(props: ViewChannelProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/channel/view', 'GET', props)
  }

  async createChannel(props: CreateChannelProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/channel/create', 'POST', props)
  }

  async deleteChannel(props: DeleteChannelProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/channel/delete', 'POST', props)
  }

  async moveUser(props: MoveUserProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/channel/move-user', 'POST', props)
  }

  // --- Guild Role ---

  async listGuildRoles(props: ListGuildRoleProps): Promise<KResponseExt<PaginatedData<any>>> {
    return this.request('/api/v3/guild-role/list', 'GET', props)
  }

  async createGuildRole(props: CreateGuildRoleProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/guild-role/create', 'POST', props)
  }

  async updateGuildRole(props: UpdateGuildRoleProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/guild-role/update', 'POST', props)
  }

  async deleteGuildRole(props: DeleteGuildRoleProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/guild-role/delete', 'POST', props)
  }

  async grantRole(props: GrantRevokeRoleProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/guild-role/grant', 'POST', props)
  }

  async revokeRole(props: GrantRevokeRoleProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/guild-role/revoke', 'POST', props)
  }

  // --- Direct Message ---

  async listDirectMessages(props: ListDirectMessageProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/direct-message/list', 'GET', props)
  }

  async createDirectMessage(props: CreateDirectMessageProps): Promise<KResponseExt<CreateMessageResult>> {
    return this.request('/api/v3/direct-message/create', 'POST', props)
  }

  async updateDirectMessage(props: UpdateDirectMessageProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/direct-message/update', 'POST', props)
  }

  async deleteDirectMessage(props: DeleteDirectMessageProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/direct-message/delete', 'POST', props)
  }

  async addDirectMessageReaction(props: DirectMessageReactionProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/direct-message/add-reaction', 'POST', props)
  }

  async deleteDirectMessageReaction(props: DirectMessageReactionProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/direct-message/delete-reaction', 'POST', props)
  }

  // --- User Chat ---

  async listUserChats(props: ListUserChatProps = {}): Promise<KResponseExt<PaginatedData<any>>> {
    return this.request('/api/v3/user-chat/list', 'GET', props)
  }

  async viewUserChat(props: ViewUserChatProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/user-chat/view', 'GET', props)
  }

  async createUserChat(props: CreateUserChatProps): Promise<KResponseExt<any>> {
    return this.request('/api/v3/user-chat/create', 'POST', props)
  }

  async deleteUserChat(props: DeleteUserChatProps): Promise<KResponseExt<{}>> {
    return this.request('/api/v3/user-chat/delete', 'POST', props)
  }
}

function fail(code: number, message: string): KResponseExt<any> {
  return { success: false, message, code, data: {} }
}

function failureFromStatusCode(statusCode: number): KResponseExt<any> {
  switch (statusCode) {
    case 401:
      return fail(401, 'Unauthorized')
    case 403:
      return fail(403, 'Forbidden')
    case 404:
      return fail(404, 'Not found')
    case 500:
      return fail(500, 'Server error')
    default:
      return fail(statusCode, `HTTP ${statusCode}`)
  }
}
