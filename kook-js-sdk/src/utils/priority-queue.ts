/**
 * 最小堆优先队列
 *
 * 优先级数值越小越先出队
 */
export class PriorityQueue<T> {
  protected heap: PriorityQueueItem<T>[] = []

  enqueue(value: T, priority: number): void {
    const item: PriorityQueueItem<T> = { value, priority }
    this.heap.push(item)
    this.bubbleUp(this.heap.length - 1)
  }

  dequeue(): [T, number] | undefined {
    if (this.isEmpty()) {
      return undefined
    }

    this.swap(0, this.heap.length - 1)
    const item = this.heap.pop()
    this.bubbleDown(0)

    if (!item) {
      return undefined
    }

    return [item.value, item.priority]
  }

  isEmpty(): boolean {
    return this.heap.length === 0
  }

  size(): number {
    return this.heap.length
  }

  clear(): void {
    this.heap = []
  }

  private bubbleUp(index: number): void {
    const parentIndex = Math.floor((index - 1) / 2)

    if (index > 0 && this.heap[index].priority < this.heap[parentIndex].priority) {
      this.swap(index, parentIndex)
      this.bubbleUp(parentIndex)
    }
  }

  private bubbleDown(index: number): void {
    const leftChildIndex = 2 * index + 1
    const rightChildIndex = 2 * index + 2
    let smallestIndex = index

    if (leftChildIndex < this.heap.length && this.heap[leftChildIndex].priority < this.heap[smallestIndex].priority) {
      smallestIndex = leftChildIndex
    }

    if (
      rightChildIndex < this.heap.length &&
      this.heap[rightChildIndex].priority < this.heap[smallestIndex].priority
    ) {
      smallestIndex = rightChildIndex
    }

    if (smallestIndex !== index) {
      this.swap(index, smallestIndex)
      this.bubbleDown(smallestIndex)
    }
  }

  protected swap(index1: number, index2: number): void {
    ;[this.heap[index1], this.heap[index2]] = [this.heap[index2], this.heap[index1]]
  }
}

interface PriorityQueueItem<T> {
  value: T
  priority: number
}
