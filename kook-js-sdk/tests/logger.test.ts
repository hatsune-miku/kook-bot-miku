import { describe, expect, it } from 'vitest'

import { createLogger } from '../src/utils/logger'

describe('createLogger', () => {
  it('should create a logger with default config', () => {
    const logger = createLogger()
    expect(logger.debug).toBeTypeOf('function')
    expect(logger.info).toBeTypeOf('function')
    expect(logger.warn).toBeTypeOf('function')
    expect(logger.error).toBeTypeOf('function')
  })

  it('should respect log level filtering', () => {
    const messages: string[] = []
    const logger = createLogger({
      level: 'warn',
      handler: (level) => {
        messages.push(level)
      },
    })

    logger.debug('skip')
    logger.info('skip')
    logger.warn('show')
    logger.error('show')

    expect(messages).toEqual(['warn', 'error'])
  })

  it('should use custom prefix', () => {
    let capturedPrefix = ''
    const logger = createLogger({
      prefix: 'test-bot',
      handler: (_level, prefix) => {
        capturedPrefix = prefix
      },
    })

    logger.info('hello')
    expect(capturedPrefix).toBe('test-bot')
  })

  it('should pass arguments to handler', () => {
    let capturedArgs: any[] = []
    const logger = createLogger({
      handler: (_level, _prefix, ...args) => {
        capturedArgs = args
      },
    })

    logger.info('hello', 42, { key: 'value' })
    expect(capturedArgs).toEqual(['hello', 42, { key: 'value' }])
  })

  it('should not call handler when level is silent', () => {
    let called = false
    const logger = createLogger({
      level: 'silent',
      handler: () => {
        called = true
      },
    })

    logger.debug('skip')
    logger.info('skip')
    logger.warn('skip')
    logger.error('skip')
    expect(called).toBe(false)
  })
})
