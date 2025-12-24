import { readFile } from 'fs/promises'
import { DateTime } from 'luxon'
import { lookup } from 'mime-types'

import {
  ContextProps,
  CreateChannelMessageProps,
  CreateChannelMessageResult,
  CreateChannelPrivateMessageProps,
  EditChannelMessageProps,
  KGatewayResult,
  KRateLimitHeader,
  KResponse,
  KResponseExt,
  KResponseHeader,
  QuerySelfResult,
  QuerySelfExtendProps as QueryUserProps,
  WhoAmIExtendResult as QueryUserResult,
} from './types'

import { botKookUserStore } from '../../cached-store/bot-kook-user'
import { DisplayName } from '../../global/shared'
import { KEventType, OpenGatewayProps } from '../../websocket/kwebsocket/types'
import { MessageLengthUpperBound, configUtils } from '../config/config'
import { Env, reloadConfig } from '../env/env'
import { error } from '../logging/logger'
import { die } from '../server/die'

reloadConfig()

export const BASE_URL = Env.KOOKBaseUrl
export const AUTHORIZATION = `Bot ${Env.BotToken}`

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

const bucketToSpeedLimitIndication = new Map<string, KRateLimitHeader | null>()

/** 指示一个时间戳（毫秒），所有请求在此之前都不应该再发给 KOOK */
let disabledUntil: number = 0

export class Requests {
  static async request<T>(
    url: string,
    method: RequestMethod,
    data?: any,
    isFormData: boolean = false,
    returnRaw: boolean = false
  ): Promise<KResponseExt<T>> {
    const bucket = url.replace(`/api/v3/`, '')

    if (disabledUntil > DateTime.now().toMillis()) {
      return fail(1147, `All requests blocked until ${disabledUntil}`)
    }

    const indication = bucketToSpeedLimitIndication.get(bucket)

    if (indication) {
      if (indication.requestsRemaining < 10 && Math.random() < 0.5) {
        return fail(1148, `Too many requests for bucket ${bucket}`)
      }
    }

    const requestData: any = data || {}
    const headers = {
      Authorization: AUTHORIZATION,
    }
    if (!isFormData) {
      headers['Content-type'] = 'application/json'
    }

    const request = {
      headers: headers,
      method: method,
      body: null,
    }

    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      if (method === 'POST' && isFormData) {
        request.body = requestData
      } else {
        request.body = JSON.stringify(requestData)
      }
    } else {
      url += '?' + queryFromObject(requestData)
    }

    let responseText: string
    let responseHeader: KResponseHeader | undefined
    let responseObject: KResponse<T>

    try {
      const response = await fetch(BASE_URL + url, request)
      responseText = await response.text()

      if (returnRaw) {
        return responseText as any
      }

      responseHeader = extractKResponseHeader(response.headers)

      if (response.status !== 200) {
        return failureFromCode(response.status)
      }
    } catch (e) {
      error(e)
      return fail(1145, '网络错误')
    }

    if (responseHeader) {
      const actualBucket = responseHeader.rateLimit.bucket
      if (actualBucket !== bucket && !actualBucket.includes(bucket) && !bucket.includes(actualBucket)) {
        die(`Bucket not match (expected=${bucket}, actual=${actualBucket}).`)
      }

      if (responseHeader.rateLimit.didTriggeredGlobalRateLimit) {
        disabledUntil = responseHeader.rateLimit.timestampSecondsWhenFullyRecovered * 1000
        return fail(1146, 'Speed rate hard limit reached.')
      }
      bucketToSpeedLimitIndication.set(bucket, responseHeader.rateLimit)
    }

    try {
      responseObject = JSON.parse(responseText)
    } catch {
      error('返回数据不是有效的JSON')
      return fail(1145, '返回数据不是有效的JSON')
    }

    return { success: true, ...responseObject }
  }

  /**
   * @param props compress: 是否压缩？fromDisconnect: 是否为断线重连？
   * @returns
   */
  static async openGateway(props: OpenGatewayProps): Promise<KResponseExt<KGatewayResult>> {
    const queryParams: any = {
      compress: props.compress ? 1 : 0,
    }

    if (props.fromDisconnect) {
      queryParams['resume'] = 1
      queryParams['sn'] = props.lastProcessedSn
      queryParams['session_id'] = props.lastSessionId
    }

    return Requests.request('/api/v3/gateway/index', 'GET', queryParams)
  }

  static async reactToMessage(messageId: string, emojiCode: string): Promise<KResponseExt<[]>> {
    return this.request(`/api/v3/message/add-reaction`, 'POST', {
      msg_id: messageId,
      emoji: emojiCode,
    })
  }

  static async createChannelMessage(
    props: CreateChannelMessageProps,
    { guildId, originalTextContent }: ContextProps = {}
  ): Promise<KResponseExt<CreateChannelMessageResult>> {
    if (props.content.length > MessageLengthUpperBound) {
      error('Message content exceeds length limit.')
      return { success: false, code: 1149, message: 'Message too long', data: {} as any }
    }
    const result: KResponseExt<CreateChannelMessageResult> = await this.request(`/api/v3/message/create`, 'POST', props)
    if (guildId && result.code === 0 && result.data?.msg_id) {
      await configUtils.main.contextUnits.createContextUnit({
        guildId,
        channelId: props.target_id,
        authorUserId: botKookUserStore.me.id,
        messageId: result.data.msg_id,
        authorName: DisplayName,
        role: 'assistant',
        content: originalTextContent || props.content,
      })
    }
    return result
  }

  static async createChannelPrivateMessage({
    cardBuilder,
    targetUserId,
    channelId,
  }: CreateChannelPrivateMessageProps): Promise<KResponseExt<CreateChannelMessageResult>> {
    const cardContent = cardBuilder
      .addDivider()
      .addKMarkdownText(`(met)${targetUserId}(met)(font)，这条消息仅你可见。(font)[secondary]`)
      .build()
    return this.createChannelMessage({
      type: KEventType.Card,
      target_id: channelId,
      temp_target_id: targetUserId,
      content: cardContent,
    })
  }

  static async updateChannelMessage(
    props: EditChannelMessageProps,
    { guildId, originalTextContent }: ContextProps = {}
  ): Promise<KResponseExt<{}>> {
    if (props.content.length > MessageLengthUpperBound) {
      error('Message content exceeds length limit.')
      return { success: false, code: 1149, message: 'Message too long', data: {} }
    }
    const result: KResponseExt<{}> = await this.request(`/api/v3/message/update`, 'POST', props)
    if (result.code === 0 && guildId) {
      await configUtils.main.contextUnits.updateContextUnit({
        guildId,
        channelId: props.extra.target_id,
        messageId: props.msg_id,
        role: 'assistant',
        authorName: DisplayName,
        authorUserId: botKookUserStore.me.id,
        content: originalTextContent || props.content,
      })
    }
    return result
  }

  static async uploadFile(path: string): Promise<[string, number]> {
    const fileData = new Blob([await readFile(path)], {
      type: lookup(path) || undefined,
    })
    const requestData = new FormData()
    requestData.append('file', fileData, path)

    const result = (await this.request(`/api/v3/asset/create`, 'POST', requestData, true, true)) as any as string
    const resultParsed = JSON.parse(result)
    const url = resultParsed.data?.url || ''
    const size = fileData.size
    return [url, size]
  }

  static async querySelfUser(): Promise<KResponseExt<QuerySelfResult>> {
    return this.request(`/api/v3/user/me`, 'GET')
  }

  static async queryUser(props: QueryUserProps): Promise<KResponseExt<QueryUserResult>> {
    return this.request(`/api/v3/user/view`, 'GET', props)
  }
}

/**
 * @example {a: 1, b: 2} => 'a=1&b=2'
 */
export function queryFromObject(obj: Record<string, any>): string {
  return Object.keys(obj)
    .map((key) => `${key}=${obj[key]}`)
    .join('&')
}

function fail(code: number, message: string): KResponseExt<any> {
  return { success: false, message: message, code: code, data: {} }
}

function failureFromCode(statusCode: number): KResponseExt<any> {
  switch (statusCode) {
    case 401:
      return fail(401, '未授权')
    case 403:
      return fail(403, '禁止访问')
    case 404:
      return fail(404, '找不到资源')
    case 500:
      return fail(500, '服务器错误')
    default:
      return fail(1145, '未知错误')
  }
}

function extractKResponseHeader(headers: Headers): KResponseHeader | undefined {
  const requestsAllowed = headers.get('X-Rate-Limit-Limit')
  const requestsRemaining = headers.get('X-Rate-Limit-Remaining')
  const timestampSecondsWhenFullyRecovered = headers.get('X-Rate-Limit-Reset')
  const bucket = headers.get('X-Rate-Limit-Bucket')
  const didTriggeredGlobalRateLimit = headers.get('X-Rate-Limit-Global')

  if (!requestsAllowed || !requestsRemaining || !timestampSecondsWhenFullyRecovered || !bucket) {
    return undefined
  }

  return {
    rateLimit: {
      requestsAllowed: Number.parseInt(requestsAllowed),
      requestsRemaining: Number.parseInt(requestsRemaining),
      timestampSecondsWhenFullyRecovered: Number.parseInt(timestampSecondsWhenFullyRecovered),
      bucket: bucket,
      didTriggeredGlobalRateLimit: !!didTriggeredGlobalRateLimit,
    },
  }
}
