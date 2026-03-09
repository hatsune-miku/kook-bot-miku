import { RestClient } from '../http/rest-client'
import { KEventTypes } from '../types/event-type'
import { CardBuilder } from './card-builder'
import { createLogger, Logger } from '../utils/logger'

export interface StreamingCardConfig {
  /** RestClient 实例 */
  api: RestClient
  /** 目标频道 ID */
  targetId: string
  /** 卡片消息长度上限（字符数），默认 4500 */
  maxLength?: number
  /** 更新节流间隔（ms），默认 300 */
  throttleMs?: number
  /** 引用的消息 ID */
  quoteMessageId?: string
  /** 初始卡片模板（由调用方定制初始占位内容） */
  initialCard?: (card: CardBuilder) => CardBuilder
  /** 每次更新前的卡片预处理（例如移除"打字中"文本） */
  cardPreprocessor?: (card: CardBuilder) => CardBuilder
  /** 创建消息后的回调（可用于存储 context 等），会被 await */
  onMessageCreated?: (msgId: string, content: string) => void | Promise<void>
  /** 更新消息后的回调 */
  onMessageUpdated?: (msgId: string, content: string) => void
  /** 自定义日志器 */
  logger?: Logger
}

export interface StreamingCardSession {
  update(procedure: (card: CardBuilder) => CardBuilder): Promise<void>
  commit(): void
}

/**
 * 流式卡片消息 + 自动分片
 *
 * 用于流式更新 KOOK 卡片消息，当内容超过长度限制时自动截断当前卡片并创建新卡片继续写入。
 */
export class StreamingCard {
  private activeCard: CardBuilder | null = null
  private activeMessageId: string | null = null
  private accumulatedContent = ''

  private readonly api: RestClient
  private readonly targetId: string
  private readonly maxLength: number
  private readonly throttleMs: number
  private readonly quoteMessageId: string | undefined
  private readonly initialCard: ((card: CardBuilder) => CardBuilder) | undefined
  private readonly cardPreprocessor: ((card: CardBuilder) => CardBuilder) | undefined
  private readonly onMessageCreated: ((msgId: string, content: string) => void | Promise<void>) | undefined
  private readonly onMessageUpdated: ((msgId: string, content: string) => void) | undefined
  private readonly logger: Logger

  constructor(config: StreamingCardConfig) {
    this.api = config.api
    this.targetId = config.targetId
    this.maxLength = config.maxLength ?? 4500
    this.throttleMs = config.throttleMs ?? 300
    this.quoteMessageId = config.quoteMessageId
    this.initialCard = config.initialCard
    this.cardPreprocessor = config.cardPreprocessor
    this.onMessageCreated = config.onMessageCreated
    this.onMessageUpdated = config.onMessageUpdated
    this.logger = config.logger ?? createLogger({ prefix: 'streaming-card' })
  }

  /**
   * 初始化：发送初始占位卡片
   */
  async initialize(): Promise<void> {
    await this.ensureActiveCard()
  }

  /**
   * 流式追加文本（自动分片 + 代码块修复）
   */
  async appendText(content: string): Promise<void> {
    const merged = this.accumulatedContent + content
    const activeCard = await this.ensureActiveCard()

    // 首次追加：用预处理器移除占位模块（如"打字中"）
    // 后续追加：移除上一次追加的文本模块
    if (this.accumulatedContent === '') {
      this.preprocess(activeCard)
    } else {
      activeCard.undoLastAdd()
    }

    const cardWithMergedContent = activeCard.addKMarkdownText(merged)
    const serializedLength = cardWithMergedContent.serializedLength
    if (serializedLength < this.maxLength) {
      await this.updateActiveCard(cardWithMergedContent, merged)
      this.accumulatedContent += content
      return
    }

    // 超长，先撤回刚加的 merged 文本
    activeCard.undoLastAdd()

    const excess = serializedLength - this.maxLength
    let truncatedContent = content.slice(0, content.length - excess)
    let remainingContent = content.slice(truncatedContent.length)

    if (containsUnpairedCodeBlocks(truncatedContent)) {
      truncatedContent += '```'
    }

    if (containsUnpairedCodeBlocks(remainingContent)) {
      remainingContent = '```' + remainingContent
    }

    if (truncatedContent.length > 0) {
      const truncatedMerged = this.accumulatedContent + truncatedContent
      activeCard.addKMarkdownText(truncatedMerged)
      await this.updateActiveCard(activeCard, truncatedMerged)
    }
    this.finalizeCurrentCard()

    await this.appendText(remainingContent)
  }

  /**
   * 事务式更新（快照/回退机制）
   */
  async createTransaction(processor: (session: StreamingCardSession) => Promise<void> | void): Promise<void> {
    const session: StreamingCardSession = {
      update: async (atomicUpdateProcedure) => {
        let card = await this.ensureActiveCard()
        const snapshot = card.createSnapshot()

        card = atomicUpdateProcedure(card)

        // 本次更新没超过长度限制，直接更新
        const serializedLength = card.serializedLength
        if (serializedLength < this.maxLength) {
          await this.updateActiveCard(card, this.accumulatedContent)
          return
        }

        // 超过长度限制，先回退进度
        card.restore(snapshot)

        // 看看全新的空卡片会不会超
        let emptyCard = CardBuilder.fromTemplate()
        emptyCard = atomicUpdateProcedure(emptyCard)

        // 空卡片也会超过长度限制，静默跳过并 log
        if (emptyCard.serializedLength > this.maxLength) {
          this.logger.warn('原子更新在空卡片上也超过长度限制，跳过本次更新')
          return
        }

        this.finalizeCurrentCard()
        return session.update(atomicUpdateProcedure)
      },
      commit: () => {
        this.finalizeCurrentCard()
      },
    }
    await processor(session)
  }

  /**
   * 收尾：在最后一张卡片上添加后处理内容
   */
  async finalize(postProcessor?: ((card: CardBuilder) => CardBuilder) | null): Promise<void> {
    if (!this.activeCard || !postProcessor) {
      return
    }
    await this.createTransaction(async (session) => {
      await session.update(postProcessor)
      session.commit()
    })
    this.finalizeCurrentCard()
  }

  // --- 内部方法 ---

  private async ensureActiveCard(): Promise<CardBuilder> {
    if (this.activeCard) {
      return this.activeCard
    }

    let card = CardBuilder.fromTemplate()
    if (this.initialCard) {
      card = this.initialCard(card)
    }
    this.activeCard = card

    const { success, data } = await this.api.createMessage({
      type: KEventTypes.Card,
      target_id: this.targetId,
      content: this.activeCard.build(),
      reply_msg_id: this.quoteMessageId,
    })
    if (success && data) {
      this.activeMessageId = data.msg_id
      await this.onMessageCreated?.(data.msg_id, this.accumulatedContent)
    }

    return this.activeCard
  }

  private preprocess(card: CardBuilder): CardBuilder {
    if (this.cardPreprocessor) {
      return this.cardPreprocessor(card)
    }
    return card
  }

  private async updateActiveCard(nextState: CardBuilder, textContent?: string): Promise<void> {
    this.activeCard = nextState
    if (!this.activeMessageId) {
      return
    }
    // fire-and-forget：不等 API 返回，由 sleep 节流控制频率
    this.api.updateMessage({
      msg_id: this.activeMessageId,
      content: this.activeCard.build(),
      reply_msg_id: this.quoteMessageId,
      extra: {
        type: KEventTypes.Card,
        target_id: this.targetId,
      },
    })
    this.onMessageUpdated?.(this.activeMessageId, textContent ?? '')
    await sleep(this.throttleMs)
  }

  private finalizeCurrentCard(): void {
    this.activeCard = null
    this.accumulatedContent = ''
  }
}

function containsUnpairedCodeBlocks(text: string): boolean {
  const matches = text.matchAll(/```/g)
  let count = 0
  for (const _match of matches) {
    count++
  }
  return count % 2 !== 0
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
