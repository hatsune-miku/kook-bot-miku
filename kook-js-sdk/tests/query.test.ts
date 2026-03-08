import { describe, expect, it } from 'vitest'

import { queryFromObject } from '../src/utils/query'

describe('queryFromObject', () => {
  it('should convert object to query string', () => {
    expect(queryFromObject({ a: 1, b: 'hello' })).toBe('a=1&b=hello')
  })

  it('should handle empty object', () => {
    expect(queryFromObject({})).toBe('')
  })

  it('should filter out undefined and null values', () => {
    expect(queryFromObject({ a: 1, b: undefined, c: null, d: 'ok' })).toBe('a=1&d=ok')
  })

  it('should encode special characters', () => {
    expect(queryFromObject({ q: 'hello world', tag: 'a&b' })).toBe('q=hello%20world&tag=a%26b')
  })

  it('should handle boolean and numeric values', () => {
    expect(queryFromObject({ flag: true, count: 0 })).toBe('flag=true&count=0')
  })
})
