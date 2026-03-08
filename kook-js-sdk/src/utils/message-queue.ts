import { PriorityQueue } from './priority-queue'

/**
 * KOOK 消息优先队列
 *
 * 扩展 PriorityQueue，提供序列号连续性检测能力
 */
export class KMessageQueue<T> extends PriorityQueue<T> {
  /**
   * 检查将 lastSn 加入后，队列中所有 priority 是否形成步长为 1 的严格递增序列
   */
  isPriorityStrictAscending(lastSn: number): boolean {
    const priorities = [...this.heap.map((item) => item.priority), lastSn].sort((a, b) => a - b)
    for (let i = 1; i < priorities.length; i++) {
      if (priorities[i] - priorities[i - 1] !== 1) {
        return false
      }
    }
    return true
  }
}
