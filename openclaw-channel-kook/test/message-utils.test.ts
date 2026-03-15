import { describe, it, expect } from 'vitest'

import { buildMsgContext, stripKookMentions, formatKMarkdown } from '../src/message-utils'

describe('stripKookMentions', () => {
  it('removes (met) labels', () => {
    const input = 'hello (met)12345(met) world'
    expect(stripKookMentions(input)).toBe('hello  world')
  })

  it('removes (rol) labels', () => {
    const input = 'hello (rol)admin(rol) everyone'
    expect(stripKookMentions(input)).toBe('hello  everyone')
  })

  it('removes both (met) and (rol)', () => {
    const input = '(met)bot(met) hey (rol)mod(rol)'
    expect(stripKookMentions(input)).toBe('hey')
  })

  it('handles text without labels', () => {
    expect(stripKookMentions('plain text')).toBe('plain text')
  })

  it('handles empty string', () => {
    expect(stripKookMentions('')).toBe('')
  })
})

describe('formatKMarkdown', () => {
  it('converts h1 headers to bold', () => {
    expect(formatKMarkdown('# Title')).toBe('**Title**')
  })

  it('converts h2 headers to bold', () => {
    expect(formatKMarkdown('## Subtitle')).toBe('**Subtitle**')
  })

  it('converts h3 headers to bold', () => {
    expect(formatKMarkdown('### Section')).toBe('**Section**')
  })

  it('leaves regular text unchanged', () => {
    const text = 'Hello **world** with `code`'
    expect(formatKMarkdown(text)).toBe(text)
  })

  it('handles multiline content', () => {
    const input = '# Title\nSome text\n## Subtitle\nMore text'
    const expected = '**Title**\nSome text\n**Subtitle**\nMore text'
    expect(formatKMarkdown(input)).toBe(expected)
  })
})

describe('buildMsgContext', () => {
  const baseEvent = {
    channel_type: 'GROUP' as const,
    type: 9,
    target_id: 'channel-123',
    author_id: 'user-456',
    content: '(met)bot(met) hello',
    msg_id: 'msg-789',
    msg_timestamp: 1710000000000,
    nonce: '',
    extra: {
      type: 9,
      guild_id: 'guild-001',
      channel_name: 'test-channel',
      mention: ['bot-id'],
      mention_all: false,
      mention_roles: [],
      mention_here: false,
      author: {
        id: 'user-456',
        username: 'TestUser',
        nickname: 'Tester',
        identify_num: '1234',
        online: true,
        bot: false,
        status: 0,
        avatar: '',
        roles: [],
      },
    },
  }

  it('builds context with correct fields', () => {
    const ctx = buildMsgContext({
      event: baseEvent,
      body: '[kook:user-456] hello',
      rawBody: 'hello',
      envelope: '[kook:user-456] hello',
      sessionKey: 'session-key',
      accountId: 'default',
      chatType: 'group',
      mentioned: true,
      senderName: 'Tester',
      guildId: 'guild-001',
      commandAuthorized: true,
    })

    expect(ctx.From).toBe('kook:user-456')
    expect(ctx.To).toBe('kook:channel-123')
    expect(ctx.SessionKey).toBe('session-key')
    expect(ctx.ChatType).toBe('group')
    expect(ctx.Provider).toBe('kook')
    expect(ctx.Surface).toBe('kook')
    expect(ctx.WasMentioned).toBe(true)
    expect(ctx.SenderName).toBe('Tester')
    expect(ctx.SenderId).toBe('user-456')
    expect(ctx.GroupSpace).toBe('guild-001')
    expect(ctx.GroupChannel).toBe('channel-123')
    expect(ctx.CommandAuthorized).toBe(true)
    expect(ctx.RawBody).toBe('hello')
  })

  it('sets GroupChannel to undefined for direct messages', () => {
    const ctx = buildMsgContext({
      event: { ...baseEvent, channel_type: 'PERSON' as const },
      body: 'hi',
      rawBody: 'hi',
      envelope: '[kook:user-456] hi',
      sessionKey: 'session-key',
      accountId: 'default',
      chatType: 'direct',
      mentioned: false,
      senderName: 'Tester',
      guildId: null,
      commandAuthorized: false,
    })

    expect(ctx.ChatType).toBe('direct')
    expect(ctx.GroupChannel).toBeUndefined()
    expect(ctx.GroupSpace).toBeUndefined()
  })

  it('includes InboundHistory when provided', () => {
    const history = [
      { sender: 'Alice', body: 'hey everyone', timestamp: 1709999990000 },
      { sender: 'Bob', body: 'what is up', timestamp: 1709999995000 },
    ]
    const ctx = buildMsgContext({
      event: baseEvent,
      body: 'hello with context',
      rawBody: 'hello',
      envelope: 'hello with context',
      sessionKey: 'session-key',
      accountId: 'default',
      chatType: 'group',
      mentioned: true,
      senderName: 'Tester',
      guildId: 'guild-001',
      commandAuthorized: true,
      inboundHistory: history,
    })

    expect(ctx.InboundHistory).toEqual(history)
  })
})
