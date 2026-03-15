import { describe, it, expect } from 'vitest'

import { kookConfigAdapter } from '../src/config'

describe('kookConfigAdapter', () => {
  describe('listAccountIds', () => {
    it('returns empty for unconfigured', () => {
      expect(kookConfigAdapter.listAccountIds({} as any)).toEqual([])
    })

    it('returns default when botToken is set', () => {
      const cfg = { channels: { kook: { botToken: 'test' } } }
      expect(kookConfigAdapter.listAccountIds(cfg as any)).toEqual(['default'])
    })
  })

  describe('resolveAccount', () => {
    it('resolves account correctly', () => {
      const cfg = { channels: { kook: { botToken: 'my-token' } } }
      const account = kookConfigAdapter.resolveAccount(cfg as any)
      expect(account.botToken).toBe('my-token')
    })
  })

  describe('isEnabled', () => {
    it('returns true when enabled', () => {
      expect(kookConfigAdapter.isEnabled!({ botToken: 't', enabled: true, baseUrl: '', logLevel: '', trustedGuilds: [], acceptBotMessage: true }, {} as any)).toBe(true)
    })

    it('returns false when disabled', () => {
      expect(kookConfigAdapter.isEnabled!({ botToken: 't', enabled: false, baseUrl: '', logLevel: '', trustedGuilds: [], acceptBotMessage: true }, {} as any)).toBe(false)
    })
  })

  describe('isConfigured', () => {
    it('returns true when botToken is set', () => {
      expect(kookConfigAdapter.isConfigured!({ botToken: 'token', enabled: true, baseUrl: '', logLevel: '', trustedGuilds: [], acceptBotMessage: true }, {} as any)).toBe(true)
    })

    it('returns false when botToken is empty', () => {
      expect(kookConfigAdapter.isConfigured!({ botToken: '', enabled: true, baseUrl: '', logLevel: '', trustedGuilds: [], acceptBotMessage: true }, {} as any)).toBe(false)
    })
  })

  describe('describeAccount', () => {
    it('returns snapshot', () => {
      const account = { botToken: 'token', enabled: true, baseUrl: '', logLevel: '', trustedGuilds: [], acceptBotMessage: true }
      const snapshot = kookConfigAdapter.describeAccount!(account, {} as any)
      expect(snapshot.accountId).toBe('default')
      expect(snapshot.enabled).toBe(true)
      expect(snapshot.configured).toBe(true)
    })
  })
})
