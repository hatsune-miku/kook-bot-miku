import { DirectiveItem } from './types'

/**
 * 指令注册表
 *
 * 管理指令的注册、查找和注销
 */
export class DirectiveRegistry {
  private directives: DirectiveItem[] = []

  /**
   * 注册指令
   */
  register(item: DirectiveItem): void {
    this.directives.push(item)
  }

  /**
   * 批量注册
   */
  registerAll(items: DirectiveItem[]): void {
    for (const item of items) {
      this.register(item)
    }
  }

  /**
   * 注销指令
   */
  unregister(triggerWord: string): void {
    this.directives = this.directives.filter((d) => {
      if (Array.isArray(d.triggerWord)) {
        return !d.triggerWord.includes(triggerWord)
      }
      return d.triggerWord !== triggerWord
    })
  }

  /**
   * 查找指令
   */
  find(directiveName: string): DirectiveItem | undefined {
    return this.directives.find((d) => {
      if (Array.isArray(d.triggerWord)) {
        return d.triggerWord.includes(directiveName)
      }
      return d.triggerWord === directiveName
    })
  }

  /**
   * 获取所有已注册指令
   */
  getAll(): readonly DirectiveItem[] {
    return this.directives
  }

  /**
   * 清空所有指令
   */
  clear(): void {
    this.directives = []
  }
}
