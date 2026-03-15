import { describe, it, expect } from 'vitest'

import { kookSecurityAdapter } from '../src/access-control'

describe('kookSecurityAdapter', () => {
  describe('resolveDmPolicy', () => {
    it('defaults to open policy', () => {
      const policy = kookSecurityAdapter.resolveDmPolicy!({
        cfg: {} as any,
        account: { botToken: 'test', enabled: true, baseUrl: '', logLevel: '', trustedGuilds: [], acceptBotMessage: true },
      })

      expect(policy).not.toBeNull()
      expect(policy!.policy).toBe('open')
      expect(policy!.allowFromPath).toBe('channels.kook.allowFrom')
    })

    it('reads dmPolicy from config', () => {
      const policy = kookSecurityAdapter.resolveDmPolicy!({
        cfg: { channels: { kook: { dmPolicy: 'allowlist', allowFrom: ['kook:111'] } } } as any,
        account: { botToken: 'test', enabled: true, baseUrl: '', logLevel: '', trustedGuilds: [], acceptBotMessage: true },
      })

      expect(policy!.policy).toBe('allowlist')
      expect(policy!.allowFrom).toEqual(['kook:111'])
    })

    it('normalizes entries with kook: prefix', () => {
      const policy = kookSecurityAdapter.resolveDmPolicy!({
        cfg: {} as any,
        account: { botToken: 'test', enabled: true, baseUrl: '', logLevel: '', trustedGuilds: [], acceptBotMessage: true },
      })

      expect(policy!.normalizeEntry!('12345')).toBe('kook:12345')
      expect(policy!.normalizeEntry!('kook:12345')).toBe('kook:12345')
    })
  })
})
