import { describe, expect, it, vi } from 'vitest'

import { TaskQueue } from '../src/utils/task-queue'

describe('TaskQueue', () => {
  it('should execute tasks in order', async () => {
    const queue = new TaskQueue()
    const order: number[] = []

    queue.submit(async () => {
      order.push(1)
    })
    queue.submit(async () => {
      order.push(2)
    })
    queue.submit(async () => {
      order.push(3)
    })

    // Wait for tasks to complete
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(order).toEqual([1, 2, 3])
  })

  it('should continue after task failure', async () => {
    const queue = new TaskQueue()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const order: number[] = []

    queue.submit(async () => {
      order.push(1)
    })
    queue.submit(async () => {
      throw new Error('fail')
    })
    queue.submit(async () => {
      order.push(3)
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(order).toEqual([1, 3])
    consoleSpy.mockRestore()
  })

  it('should stop and clear pending tasks', async () => {
    const queue = new TaskQueue()
    const order: number[] = []

    queue.submit(async () => {
      order.push(1)
      // Yield control so task 2 gets queued
      await new Promise((resolve) => setTimeout(resolve, 10))
      queue.stop()
    })

    // Queue task 2 while task 1 is waiting
    setTimeout(() => {
      queue.submit(async () => {
        order.push(2)
      })
    }, 0)

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(order).toEqual([1])
  })
})
