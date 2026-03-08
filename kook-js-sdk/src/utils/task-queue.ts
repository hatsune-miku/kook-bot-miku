type Task = () => Promise<void>

/**
 * 异步任务队列
 *
 * 保证任务按入队顺序依次执行
 */
export class TaskQueue {
  private queue: Task[] = []
  private running = false

  submit(task: Task): void {
    this.queue.push(task)
    if (!this.running) {
      this.run()
    }
  }

  private async run(): Promise<void> {
    this.running = true
    while (this.queue.length > 0) {
      const task = this.queue.shift()
      if (task) {
        try {
          await task()
        } catch (error) {
          console.error('Task failed:', error)
        }
      }
    }
    this.running = false
  }

  stop(): void {
    this.queue = []
    this.running = false
  }
}
