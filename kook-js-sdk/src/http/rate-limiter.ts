import { KRateLimitHeader, KResponseHeader } from '../types'

/**
 * HTTP 请求限速管理器
 *
 * 跟踪 per-bucket 和全局限速状态
 */
export class RateLimiter {
  private buckets = new Map<string, KRateLimitHeader>()
  private globalDisabledUntil = 0

  /**
   * 检查是否可以对指定 bucket 发起请求
   *
   * @returns null 表示可以请求，否则返回拒绝原因
   */
  check(bucket: string): string | null {
    if (this.globalDisabledUntil > Date.now()) {
      return `All requests blocked until ${new Date(this.globalDisabledUntil).toISOString()}`
    }

    const indication = this.buckets.get(bucket)
    if (indication && indication.requestsRemaining < 10 && Math.random() < 0.5) {
      return `Too many requests for bucket ${bucket}`
    }

    return null
  }

  /**
   * 从响应 Header 中更新限速状态
   */
  update(bucket: string, header: KResponseHeader): void {
    if (header.rateLimit.didTriggeredGlobalRateLimit) {
      this.globalDisabledUntil = header.rateLimit.timestampSecondsWhenFullyRecovered * 1000
    }
    this.buckets.set(bucket, header.rateLimit)
  }

  /**
   * 是否触发了全局限速
   */
  get globalBlocked(): boolean {
    return this.globalDisabledUntil > Date.now()
  }
}

/**
 * 从 HTTP 响应 Header 中提取限速信息
 */
export function extractRateLimitHeader(headers: Headers): KResponseHeader | undefined {
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
      bucket,
      didTriggeredGlobalRateLimit: didTriggeredGlobalRateLimit === '1',
    },
  }
}
