import { describe, it, expect } from 'vitest'

import { listKookAccountIds, resolveKookAccount } from '../src/types'

describe('listKookAccountIds', () => {
  it('returns empty for unconfigured channel', () => {
    expect(listKookAccountIds({})).toEqual([])
    expect(listKookAccountIds({ channels: {} })).toEqual([])
    expect(listKookAccountIds({ channels: { kook: {} } })).toEqual([])
  })

  it('returns ["default"] when botToken is set at top level', () => {
    const cfg = { channels: { kook: { botToken: 'test-token' } } }
    expect(listKookAccountIds(cfg)).toEqual(['default'])
  })

  it('returns account keys when accounts section exists', () => {
    const cfg = {
      channels: {
        kook: {
          accounts: {
            main: { botToken: 'token1' },
            secondary: { botToken: 'token2' },
          },
        },
      },
    }
    expect(listKookAccountIds(cfg)).toEqual(['main', 'secondary'])
  })
})

describe('resolveKookAccount', () => {
  it('resolves from top-level config', () => {
    const cfg = { channels: { kook: { botToken: 'my-token', baseUrl: 'https://custom.url' } } }
    const account = resolveKookAccount(cfg)

    expect(account.botToken).toBe('my-token')
    expect(account.baseUrl).toBe('https://custom.url')
    expect(account.enabled).toBe(true)
    expect(account.logLevel).toBe('info')
    expect(account.trustedGuilds).toEqual([])
    expect(account.acceptBotMessage).toBe(true)
  })

  it('defaults baseUrl to kookapp.cn', () => {
    const cfg = { channels: { kook: { botToken: 'my-token' } } }
    const account = resolveKookAccount(cfg)
    expect(account.baseUrl).toBe('https://www.kookapp.cn')
  })

  it('handles disabled flag', () => {
    const cfg = { channels: { kook: { botToken: 'my-token', enabled: false } } }
    const account = resolveKookAccount(cfg)
    expect(account.enabled).toBe(false)
  })

  it('resolves specific account from accounts section', () => {
    const cfg = {
      channels: {
        kook: {
          accounts: {
            secondary: { botToken: 'token-2', baseUrl: 'https://alt.url' },
          },
        },
      },
    }
    const account = resolveKookAccount(cfg, 'secondary')
    expect(account.botToken).toBe('token-2')
    expect(account.baseUrl).toBe('https://alt.url')
  })

  it('returns empty token for missing config', () => {
    const account = resolveKookAccount({})
    expect(account.botToken).toBe('')
  })

  it('resolves trustedGuilds from config', () => {
    const cfg = { channels: { kook: { botToken: 'tok', trustedGuilds: ['guild-1', 'guild-2'] } } }
    const account = resolveKookAccount(cfg)
    expect(account.trustedGuilds).toEqual(['guild-1', 'guild-2'])
  })

  it('resolves acceptBotMessage false from config', () => {
    const cfg = { channels: { kook: { botToken: 'tok', acceptBotMessage: false } } }
    const account = resolveKookAccount(cfg)
    expect(account.acceptBotMessage).toBe(false)
  })
})
