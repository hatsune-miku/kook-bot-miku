import { KCardElement, KCardMessage, KCardModule, KCardSize, KCardTheme } from '../types/card'

/**
 * CardBuilder 模板选项
 */
export interface CardBuilderTemplateOptions {
  initialCard?: Partial<Omit<KCardElement, 'modules'>>
}

/**
 * 卡片消息构建器
 *
 * 提供链式 API 构建 KOOK 卡片消息
 */
export class CardBuilder {
  private card: KCardMessage = [
    {
      type: 'card',
      theme: 'secondary',
      size: 'lg',
      modules: [],
    },
  ]
  private main = this.card[0]
  private modules = this.card[0].modules

  private constructor(options: CardBuilderTemplateOptions) {
    if (options.initialCard) {
      this.card[0] = { ...this.card[0], ...options.initialCard }
      this.main = this.card[0]
      this.modules = this.card[0].modules
    }
  }

  /**
   * 从模板创建 CardBuilder
   */
  static fromTemplate(
    options: CardBuilderTemplateOptions = { initialCard: { theme: 'secondary' } }
  ): CardBuilder {
    return new CardBuilder(options)
  }

  /**
   * 从快照恢复
   *
   * @param snapshot 快照对象，如果为 null 则不做任何操作
   */
  restore(snapshot: CardSnapshot | null): CardBuilder {
    if (!snapshot) {
      return this
    }
    this.card = snapshot.card
    this.main = this.card[0]
    this.modules = this.card[0].modules
    return this
  }

  /**
   * 设置卡片尺寸
   */
  size(size: KCardSize): CardBuilder {
    this.main.size = size
    return this
  }

  /**
   * 设置卡片主题
   */
  theme(theme: KCardTheme): CardBuilder {
    this.main.theme = theme
    return this
  }

  /**
   * 设置卡片边框颜色
   */
  color(color: string): CardBuilder {
    this.main.color = color
    return this
  }

  /**
   * 添加带图标的 KMarkdown 文本段落
   */
  addIconWithKMarkdownText(iconUrl: string, text: string): CardBuilder {
    this.modules.push({
      type: 'section',
      text: { type: 'kmarkdown', content: text },
      mode: 'left',
      accessory: { type: 'image', src: iconUrl, size: 'sm' },
    })
    return this
  }

  /**
   * 添加图片容器
   */
  addImage(imageUrl: string): CardBuilder {
    this.modules.push({
      type: 'container',
      elements: [{ type: 'image', src: imageUrl }],
    })
    return this
  }

  /**
   * 添加文件模块
   */
  addFile(title: string, fileUrl: string, fileSize: number): CardBuilder {
    this.modules.push({
      type: 'file',
      title,
      src: fileUrl,
      size: `${fileSize}`,
    })
    return this
  }

  /**
   * 添加 KMarkdown 文本段落
   */
  addKMarkdownText(content: string): CardBuilder {
    this.modules.push({
      type: 'section',
      text: { type: 'kmarkdown', content },
    })
    return this
  }

  /**
   * 添加纯文本段落
   */
  addPlainText(text: string): CardBuilder {
    this.modules.push({
      type: 'section',
      text: { type: 'plain-text', content: text },
    })
    return this
  }

  /**
   * 添加分割线
   */
  addDivider(): CardBuilder {
    this.modules.push({ type: 'divider' })
    return this
  }

  /**
   * 添加小时倒计时
   */
  addHourCountDown(endAt: number): CardBuilder {
    this.modules.push({
      type: 'countdown',
      mode: 'hour',
      endTime: endAt,
    })
    return this
  }

  /**
   * 添加天倒计时
   */
  addDayCountDown(endAt: number): CardBuilder {
    this.modules.push({
      type: 'countdown',
      mode: 'day',
      endTime: endAt,
    })
    return this
  }

  /**
   * 添加秒倒计时
   */
  addSecondCountDown(endAt: number): CardBuilder {
    this.modules.push({
      type: 'countdown',
      mode: 'second',
      endTime: endAt,
    })
    return this
  }

  /**
   * 添加纯文本上下文
   */
  addContext(content: string): CardBuilder {
    this.modules.push({
      type: 'context',
      elements: [{ type: 'plain-text', content }],
    })
    return this
  }

  /**
   * 添加 KMarkdown 上下文
   */
  addKMarkdownContext(content: string): CardBuilder {
    this.modules.push({
      type: 'context',
      elements: [{ type: 'kmarkdown', content }],
    })
    return this
  }

  /**
   * 添加标题
   */
  addHeader(text: string): CardBuilder {
    this.modules.push({
      type: 'header',
      text: { type: 'plain-text', content: text },
    })
    return this
  }

  /**
   * 添加按钮组
   */
  addActionGroup(
    buttons: Array<{
      text: string
      value: string
      theme?: string
    }>
  ): CardBuilder {
    this.modules.push({
      type: 'action-group',
      elements: buttons.map((btn) => ({
        type: 'button',
        theme: btn.theme ?? 'primary',
        value: btn.value,
        text: { type: 'plain-text', content: btn.text },
      })),
    })
    return this
  }

  /**
   * 撤销最后一个模块
   */
  undoLastAdd(): CardBuilder {
    if (this.modules.length > 0) {
      this.modules.pop()
    }
    return this
  }

  /**
   * 序列化后的长度
   */
  get serializedLength(): number {
    try {
      return JSON.stringify(this.card).length
    } catch {
      return 0
    }
  }

  /**
   * 最后一个模块
   */
  get lastModule(): KCardModule | undefined {
    return this.modules[this.modules.length - 1]
  }

  /**
   * 构建卡片消息 JSON 字符串
   */
  build(): string {
    try {
      return JSON.stringify(this.card)
    } catch {
      return '[]'
    }
  }

  /**
   * 创建快照用于回滚
   */
  createSnapshot(): CardSnapshot | null {
    try {
      return {
        card: structuredClone(this.card),
      }
    } catch {
      return null
    }
  }
}

/**
 * 卡片快照
 */
export interface CardSnapshot {
  card: KCardMessage
}
