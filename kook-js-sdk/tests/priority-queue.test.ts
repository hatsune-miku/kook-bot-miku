import { describe, expect, it } from 'vitest'

import { PriorityQueue } from '../src/utils/priority-queue'

describe('PriorityQueue', () => {
  it('should enqueue and dequeue in priority order', () => {
    const pq = new PriorityQueue<string>()
    pq.enqueue('low', 10)
    pq.enqueue('high', 1)
    pq.enqueue('mid', 5)

    expect(pq.dequeue()).toEqual(['high', 1])
    expect(pq.dequeue()).toEqual(['mid', 5])
    expect(pq.dequeue()).toEqual(['low', 10])
  })

  it('should return undefined when dequeueing empty queue', () => {
    const pq = new PriorityQueue<number>()
    expect(pq.dequeue()).toBeUndefined()
  })

  it('should report size correctly', () => {
    const pq = new PriorityQueue<number>()
    expect(pq.size()).toBe(0)
    expect(pq.isEmpty()).toBe(true)

    pq.enqueue(1, 1)
    pq.enqueue(2, 2)
    expect(pq.size()).toBe(2)
    expect(pq.isEmpty()).toBe(false)
  })

  it('should clear all items', () => {
    const pq = new PriorityQueue<number>()
    pq.enqueue(1, 1)
    pq.enqueue(2, 2)
    pq.clear()
    expect(pq.isEmpty()).toBe(true)
    expect(pq.size()).toBe(0)
  })

  it('should handle duplicate priorities', () => {
    const pq = new PriorityQueue<string>()
    pq.enqueue('a', 5)
    pq.enqueue('b', 5)
    pq.enqueue('c', 5)

    expect(pq.size()).toBe(3)
    const results = [pq.dequeue()![1], pq.dequeue()![1], pq.dequeue()![1]]
    expect(results).toEqual([5, 5, 5])
  })

  it('should maintain heap property with many items', () => {
    const pq = new PriorityQueue<number>()
    const values = [50, 30, 70, 10, 90, 20, 60, 40, 80]
    for (const v of values) {
      pq.enqueue(v, v)
    }

    const result: number[] = []
    while (!pq.isEmpty()) {
      result.push(pq.dequeue()![1])
    }
    expect(result).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90])
  })
})
