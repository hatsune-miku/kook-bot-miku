/**
 * 定时器管理器
 *
 * 集中管理 setTimeout / setInterval，
 * 支持在 reconnect / disconnect 时一次性清除所有 pending 定时器
 */
export class TimerManager {
  private timeouts = new Set<ReturnType<typeof setTimeout>>()
  private intervals = new Set<ReturnType<typeof setInterval>>()

  /**
   * 注册一个 setTimeout，并跟踪其生命周期
   */
  setTimeout(callback: () => void, ms: number): ReturnType<typeof setTimeout> {
    const id = setTimeout(() => {
      this.timeouts.delete(id)
      callback()
    }, ms)
    this.timeouts.add(id)
    return id
  }

  /**
   * 注册一个 setInterval，并跟踪其生命周期
   */
  setInterval(callback: () => void, ms: number): ReturnType<typeof setInterval> {
    const id = setInterval(callback, ms)
    this.intervals.add(id)
    return id
  }

  /**
   * 清除指定 timeout
   */
  clearTimeout(id: ReturnType<typeof setTimeout>): void {
    clearTimeout(id)
    this.timeouts.delete(id)
  }

  /**
   * 清除指定 interval
   */
  clearInterval(id: ReturnType<typeof setInterval>): void {
    clearInterval(id)
    this.intervals.delete(id)
  }

  /**
   * 清除所有 pending 定时器
   */
  clearAll(): void {
    for (const id of this.timeouts) {
      clearTimeout(id)
    }
    this.timeouts.clear()

    for (const id of this.intervals) {
      clearInterval(id)
    }
    this.intervals.clear()
  }

  /**
   * 当前跟踪的 timeout 数量
   */
  get pendingTimeouts(): number {
    return this.timeouts.size
  }

  /**
   * 当前跟踪的 interval 数量
   */
  get pendingIntervals(): number {
    return this.intervals.size
  }
}
