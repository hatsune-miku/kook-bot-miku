import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TimerManager } from '../src/ws/timer-manager'

describe('TimerManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should track and execute timeouts', () => {
    const tm = new TimerManager()
    let called = false
    tm.setTimeout(() => {
      called = true
    }, 100)

    expect(tm.pendingTimeouts).toBe(1)
    vi.advanceTimersByTime(100)
    expect(called).toBe(true)
    expect(tm.pendingTimeouts).toBe(0)
  })

  it('should track and execute intervals', () => {
    const tm = new TimerManager()
    let count = 0
    tm.setInterval(() => {
      count++
    }, 50)

    expect(tm.pendingIntervals).toBe(1)
    vi.advanceTimersByTime(200)
    expect(count).toBe(4)
  })

  it('should clear specific timeout', () => {
    const tm = new TimerManager()
    let called = false
    const id = tm.setTimeout(() => {
      called = true
    }, 100)

    tm.clearTimeout(id)
    vi.advanceTimersByTime(200)
    expect(called).toBe(false)
    expect(tm.pendingTimeouts).toBe(0)
  })

  it('should clear specific interval', () => {
    const tm = new TimerManager()
    let count = 0
    const id = tm.setInterval(() => {
      count++
    }, 50)

    vi.advanceTimersByTime(100)
    expect(count).toBe(2)

    tm.clearInterval(id)
    vi.advanceTimersByTime(200)
    expect(count).toBe(2)
  })

  it('should clearAll pending timers', () => {
    const tm = new TimerManager()
    let timeoutCalled = false
    let intervalCount = 0

    tm.setTimeout(() => {
      timeoutCalled = true
    }, 100)
    tm.setTimeout(() => {
      timeoutCalled = true
    }, 200)
    tm.setInterval(() => {
      intervalCount++
    }, 50)

    expect(tm.pendingTimeouts).toBe(2)
    expect(tm.pendingIntervals).toBe(1)

    tm.clearAll()

    expect(tm.pendingTimeouts).toBe(0)
    expect(tm.pendingIntervals).toBe(0)

    vi.advanceTimersByTime(500)
    expect(timeoutCalled).toBe(false)
    expect(intervalCount).toBe(0)
  })
})
