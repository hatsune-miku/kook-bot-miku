import { describe, expect, it } from 'vitest'

import { extractContent, isExplicitlyMentioningBot, removingKMarkdownLabels } from '../src/utils/content'
import { KEvent, KTextChannelExtra, KEventTypes } from '../src/types'

function makeEvent(content: string, mention: string[] = []): KEvent<KTextChannelExtra> {
  return {
    channel_type: 'GROUP',
    type: KEventTypes.KMarkdown,
    target_id: 'channel-1',
    author_id: 'user-1',
    content,
    msg_id: 'msg-1',
    msg_timestamp: Date.now(),
    nonce: '',
    extra: {
      type: KEventTypes.KMarkdown,
      guild_id: 'guild-1',
      channel_name: 'general',
      mention,
      mention_all: false,
      mention_roles: [],
      mention_here: false,
      author: {
        id: 'user-1',
        username: 'test',
        nickname: 'test',
        identify_num: '1234',
        online: true,
        bot: false,
        status: 0,
        avatar: '',
        vip_avatar: '',
        is_vip: false,
        is_sys: false,
        mobile_verified: false,
        roles: [],
      },
    },
  }
}

describe('isExplicitlyMentioningBot', () => {
  it('should return true when bot is mentioned', () => {
    const event = makeEvent('hello', ['bot-123'])
    expect(isExplicitlyMentioningBot(event, 'bot-123')).toBe(true)
  })

  it('should return false when bot is not mentioned', () => {
    const event = makeEvent('hello', ['other-user'])
    expect(isExplicitlyMentioningBot(event, 'bot-123')).toBe(false)
  })

  it('should return false for empty mention list', () => {
    const event = makeEvent('hello')
    expect(isExplicitlyMentioningBot(event, 'bot-123')).toBe(false)
  })
})

describe('removingKMarkdownLabels', () => {
  it('should remove met labels', () => {
    const result = removingKMarkdownLabels('hello (met)123(met) world', ['met'])
    expect(result).toBe('hello  world')
  })

  it('should remove multiple labels', () => {
    const result = removingKMarkdownLabels('(rol)456(rol) hello (met)123(met)', ['met', 'rol'])
    expect(result).toBe('hello')
  })

  it('should handle content without labels', () => {
    const result = removingKMarkdownLabels('just plain text', ['met'])
    expect(result).toBe('just plain text')
  })
})

describe('extractContent', () => {
  it('should remove met and rol labels and unescape characters', () => {
    const event = makeEvent('(met)bot-id(met) /help \\(test\\)')
    const result = extractContent(event)
    expect(result).toBe('/help (test)')
  })

  it('should unescape brackets', () => {
    const event = makeEvent('array\\[0\\] = \\{foo\\}')
    const result = extractContent(event)
    expect(result).toBe('array[0] = {foo}')
  })

  it('should handle clean content', () => {
    const event = makeEvent('hello world')
    const result = extractContent(event)
    expect(result).toBe('hello world')
  })
})
