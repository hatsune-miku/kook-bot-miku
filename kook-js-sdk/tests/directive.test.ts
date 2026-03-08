import { describe, expect, it, vi } from 'vitest'

import { DirectiveRegistry } from '../src/directive/registry'
import { DirectiveDispatcher } from '../src/directive/dispatcher'
import { parseDirective } from '../src/directive/parser'
import { KEvent, KTextChannelExtra, KEventTypes } from '../src/types'

function makeEvent(content: string, userId = 'user-1', roles: number[] = []): KEvent<KTextChannelExtra> {
  return {
    channel_type: 'GROUP',
    type: KEventTypes.KMarkdown,
    target_id: 'channel-1',
    author_id: userId,
    content,
    msg_id: 'msg-1',
    msg_timestamp: Date.now(),
    nonce: '',
    extra: {
      type: KEventTypes.KMarkdown,
      guild_id: 'guild-1',
      channel_name: 'general',
      mention: [],
      mention_all: false,
      mention_roles: [],
      mention_here: false,
      author: {
        id: userId,
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
        roles,
      },
    },
  }
}

describe('parseDirective', () => {
  it('should parse simple directive', () => {
    const result = parseDirective(makeEvent('/help'))
    expect(result).toEqual({ name: 'help', parameter: undefined })
  })

  it('should parse directive with parameter', () => {
    const result = parseDirective(makeEvent('/echo hello world'))
    expect(result).toEqual({ name: 'echo', parameter: 'hello world' })
  })

  it('should return undefined for non-directive messages', () => {
    expect(parseDirective(makeEvent('hello'))).toBeUndefined()
    expect(parseDirective(makeEvent(''))).toBeUndefined()
  })

  it('should return undefined for just slash', () => {
    expect(parseDirective(makeEvent('/'))).toBeUndefined()
  })

  it('should handle leading spaces in parameter', () => {
    const result = parseDirective(makeEvent('/cmd   spaced'))
    expect(result?.parameter).toBe('spaced')
  })
})

describe('DirectiveRegistry', () => {
  it('should register and find directives', () => {
    const registry = new DirectiveRegistry()
    const handler = vi.fn()
    registry.register({
      triggerWord: 'test',
      parameterDescription: '',
      description: 'test command',
      permissionGroups: ['everyone'],
      handler,
    })

    const found = registry.find('test')
    expect(found).toBeDefined()
    expect(found?.description).toBe('test command')
  })

  it('should find directive by array trigger word', () => {
    const registry = new DirectiveRegistry()
    registry.register({
      triggerWord: ['ping', 'p'],
      parameterDescription: '',
      description: 'ping',
      permissionGroups: ['everyone'],
      handler: vi.fn(),
    })

    expect(registry.find('ping')).toBeDefined()
    expect(registry.find('p')).toBeDefined()
    expect(registry.find('unknown')).toBeUndefined()
  })

  it('should unregister directives', () => {
    const registry = new DirectiveRegistry()
    registry.register({
      triggerWord: 'foo',
      parameterDescription: '',
      description: '',
      permissionGroups: [],
      handler: vi.fn(),
    })

    expect(registry.find('foo')).toBeDefined()
    registry.unregister('foo')
    expect(registry.find('foo')).toBeUndefined()
  })

  it('should get all directives', () => {
    const registry = new DirectiveRegistry()
    registry.register({ triggerWord: 'a', parameterDescription: '', description: '', permissionGroups: [], handler: vi.fn() })
    registry.register({ triggerWord: 'b', parameterDescription: '', description: '', permissionGroups: [], handler: vi.fn() })
    expect(registry.getAll()).toHaveLength(2)
  })

  it('should clear all', () => {
    const registry = new DirectiveRegistry()
    registry.register({ triggerWord: 'a', parameterDescription: '', description: '', permissionGroups: [], handler: vi.fn() })
    registry.clear()
    expect(registry.getAll()).toHaveLength(0)
  })
})

describe('DirectiveDispatcher', () => {
  it('should dispatch matching directive', async () => {
    const registry = new DirectiveRegistry()
    const handler = vi.fn()
    registry.register({
      triggerWord: 'hello',
      parameterDescription: '',
      description: '',
      permissionGroups: ['everyone'],
      handler,
    })

    const dispatcher = new DirectiveDispatcher({ registry })
    const result = await dispatcher.dispatch(makeEvent('/hello world'))

    expect(result).toBe(true)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        directive: 'hello',
        parameter: 'world',
      })
    )
  })

  it('should return false for non-matching messages', async () => {
    const registry = new DirectiveRegistry()
    const dispatcher = new DirectiveDispatcher({ registry })
    expect(await dispatcher.dispatch(makeEvent('hello'))).toBe(false)
    expect(await dispatcher.dispatch(makeEvent('/unknown'))).toBe(false)
  })

  it('should check permissions and deny', async () => {
    const registry = new DirectiveRegistry()
    const handler = vi.fn()
    const onDenied = vi.fn()

    registry.register({
      triggerWord: 'admin',
      parameterDescription: '',
      description: '',
      permissionGroups: ['admin'],
      handler,
    })

    const dispatcher = new DirectiveDispatcher({
      registry,
      onPermissionDenied: onDenied,
    })

    const result = await dispatcher.dispatch(makeEvent('/admin'))
    expect(result).toBe(true)
    expect(handler).not.toHaveBeenCalled()
    expect(onDenied).toHaveBeenCalled()
  })

  it('should use custom permission resolver', async () => {
    const registry = new DirectiveRegistry()
    const handler = vi.fn()

    registry.register({
      triggerWord: 'special',
      parameterDescription: '',
      description: '',
      permissionGroups: ['vip'],
      handler,
    })

    const dispatcher = new DirectiveDispatcher({
      registry,
      permissionResolver: (userId) => userId === 'trusted-user',
    })

    expect(await dispatcher.dispatch(makeEvent('/special', 'random-user'))).toBe(true)
    expect(handler).not.toHaveBeenCalled()

    expect(await dispatcher.dispatch(makeEvent('/special', 'trusted-user'))).toBe(true)
    expect(handler).toHaveBeenCalled()
  })
})
