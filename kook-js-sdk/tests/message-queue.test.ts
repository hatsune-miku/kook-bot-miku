import { describe, expect, it } from 'vitest'

import { KMessageQueue } from '../src/utils/message-queue'

describe('KMessageQueue', () => {
  it('should detect strict ascending priorities with lastSn', () => {
    const mq = new KMessageQueue<string>()
    mq.enqueue('msg2', 2)
    mq.enqueue('msg3', 3)

    // lastSn=1, so priorities are [1, 2, 3] → strict ascending
    expect(mq.isPriorityStrictAscending(1)).toBe(true)
  })

  it('should detect non-ascending priorities', () => {
    const mq = new KMessageQueue<string>()
    mq.enqueue('msg3', 3)
    mq.enqueue('msg5', 5)

    // lastSn=1, so priorities are [1, 3, 5] → gap at 2 and 4
    expect(mq.isPriorityStrictAscending(1)).toBe(false)
  })

  it('should handle single element', () => {
    const mq = new KMessageQueue<string>()
    mq.enqueue('msg2', 2)

    expect(mq.isPriorityStrictAscending(1)).toBe(true)
    expect(mq.isPriorityStrictAscending(0)).toBe(false)
  })

  it('should handle empty queue', () => {
    const mq = new KMessageQueue<string>()
    expect(mq.isPriorityStrictAscending(5)).toBe(true)
  })

  it('should inherit PriorityQueue behavior', () => {
    const mq = new KMessageQueue<string>()
    mq.enqueue('a', 3)
    mq.enqueue('b', 1)
    mq.enqueue('c', 2)

    expect(mq.dequeue()).toEqual(['b', 1])
    expect(mq.dequeue()).toEqual(['c', 2])
    expect(mq.dequeue()).toEqual(['a', 3])
  })
})
