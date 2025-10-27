type Task = () => Promise<void>

export class TaskQueue {
  private queue: Task[] = []
  private running = false

  submit(task: Task) {
    this.queue.push(task)
    if (!this.running) {
      this.run()
    }
  }

  private async run() {
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

  async stop() {
    this.queue = []
    this.running = false
  }
}
