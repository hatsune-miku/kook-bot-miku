import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RestClient } from '../src/http/rest-client'
import { RateLimiter, extractRateLimitHeader } from '../src/http/rate-limiter'

describe('extractRateLimitHeader', () => {
  it('should extract rate limit headers', () => {
    const headers = new Headers({
      'X-Rate-Limit-Limit': '100',
      'X-Rate-Limit-Remaining': '99',
      'X-Rate-Limit-Reset': '1700000000',
      'X-Rate-Limit-Bucket': 'message/create',
    })

    const result = extractRateLimitHeader(headers)
    expect(result).toEqual({
      rateLimit: {
        requestsAllowed: 100,
        requestsRemaining: 99,
        timestampSecondsWhenFullyRecovered: 1700000000,
        bucket: 'message/create',
        didTriggeredGlobalRateLimit: false,
      },
    })
  })

  it('should return undefined when headers are missing', () => {
    const headers = new Headers()
    expect(extractRateLimitHeader(headers)).toBeUndefined()
  })

  it('should detect global rate limit', () => {
    const headers = new Headers({
      'X-Rate-Limit-Limit': '100',
      'X-Rate-Limit-Remaining': '0',
      'X-Rate-Limit-Reset': '1700000000',
      'X-Rate-Limit-Bucket': 'message/create',
      'X-Rate-Limit-Global': '1',
    })

    const result = extractRateLimitHeader(headers)
    expect(result?.rateLimit.didTriggeredGlobalRateLimit).toBe(true)
  })
})

describe('RateLimiter', () => {
  it('should allow requests initially', () => {
    const limiter = new RateLimiter()
    expect(limiter.check('some-bucket')).toBeNull()
  })

  it('should block when global rate limit active', () => {
    const limiter = new RateLimiter()
    limiter.update('bucket', {
      rateLimit: {
        requestsAllowed: 100,
        requestsRemaining: 0,
        timestampSecondsWhenFullyRecovered: Math.floor(Date.now() / 1000) + 3600,
        bucket: 'bucket',
        didTriggeredGlobalRateLimit: true,
      },
    })

    expect(limiter.check('bucket')).toContain('blocked')
    expect(limiter.globalBlocked).toBe(true)
  })
})

describe('RestClient', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  function mockFetch(responseBody: any, status = 200, headers: Record<string, string> = {}) {
    ;(global.fetch as any).mockResolvedValue({
      status,
      text: async () => JSON.stringify(responseBody),
      headers: new Headers(headers),
    })
  }

  it('should set Authorization header', async () => {
    const client = new RestClient({ token: 'test-token' })
    mockFetch({ code: 0, message: '', data: {} })

    await client.getSelfUser()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v3/user/me'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bot test-token',
        }),
      })
    )
  })

  it('should handle successful response', async () => {
    const client = new RestClient({ token: 'test-token' })
    mockFetch({ code: 0, message: 'ok', data: { id: 'bot-1', username: 'TestBot' } })

    const result = await client.getSelfUser()
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('bot-1')
  })

  it('should handle HTTP error status', async () => {
    const client = new RestClient({ token: 'test-token' })
    mockFetch({}, 401)

    const result = await client.getSelfUser()
    expect(result.success).toBe(false)
    expect(result.code).toBe(401)
  })

  it('should handle network error', async () => {
    const client = new RestClient({
      token: 'test-token',
      logger: { debug() {}, info() {}, warn() {}, error() {} },
    })
    ;(global.fetch as any).mockRejectedValue(new Error('Network failed'))

    const result = await client.getSelfUser()
    expect(result.success).toBe(false)
    expect(result.code).toBe(1145)
  })

  it('should send POST with JSON body', async () => {
    const client = new RestClient({ token: 'test-token' })
    mockFetch({ code: 0, message: '', data: { msg_id: 'msg-1', msg_timestamp: 0, nonce: '' } })

    await client.createMessage({
      type: 9,
      target_id: 'channel-1',
      content: 'hello',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v3/message/create'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"content":"hello"'),
      })
    )
  })

  it('should append query params for GET requests', async () => {
    const client = new RestClient({ token: 'test-token' })
    mockFetch({ code: 0, message: '', data: {} })

    await client.getUser({ user_id: 'user-1', guild_id: 'guild-1' })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('user_id=user-1&guild_id=guild-1'),
      expect.anything()
    )
  })

  it('should use custom base URL', async () => {
    const client = new RestClient({ token: 'test-token', baseUrl: 'https://custom.example.com' })
    mockFetch({ code: 0, message: '', data: {} })

    await client.getSelfUser()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://custom.example.com/api/v3/user/me'),
      expect.anything()
    )
  })

  it('should build gateway URL with compression', async () => {
    const client = new RestClient({ token: 'test-token' })
    mockFetch({ code: 0, message: '', data: { url: 'wss://gateway.kookapp.cn' } })

    const result = await client.openGateway({ compress: true, fromDisconnect: false })

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('compress=1'), expect.anything())
    expect(result.data.url).toBe('wss://gateway.kookapp.cn')
  })

  it('should build gateway URL with resume params', async () => {
    const client = new RestClient({ token: 'test-token' })
    mockFetch({ code: 0, message: '', data: { url: 'wss://gateway.kookapp.cn' } })

    await client.openGateway({
      compress: false,
      fromDisconnect: true,
      lastProcessedSn: 42,
      lastSessionId: 'session-abc',
    })

    const calledUrl = (global.fetch as any).mock.calls[0][0]
    expect(calledUrl).toContain('resume=1')
    expect(calledUrl).toContain('sn=42')
    expect(calledUrl).toContain('session_id=session-abc')
  })
})
