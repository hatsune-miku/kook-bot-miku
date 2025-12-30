import { sleep } from 'radash'

import { Requests } from './request'

import { CardBuilder, CardIcons } from '../../helpers/card-helper'
import { KEventType } from '../../websocket/kwebsocket/types'
import { MessageLengthUpperBound } from '../config/config'
import { die } from '../server/die'

export interface IDialogueSession {
  update(atomicProcedure: (card: CardBuilder) => CardBuilder, contextToAppend?: string): Promise<void>
  commit(): void
}

export class Dialogue {
  private activeCard: CardBuilder | null = null
  private activeMessageId: string | null = null
  private activeAccumulatedContent = ''

  constructor(
    private guildId: string,
    private targetId: string,
    private triggerMessageId: string | null = null
  ) {}

  async initialize() {
    await this.ensureActiveCard()
  }

  private async ensureActiveCard() {
    if (this.activeCard) {
      return this.activeCard
    }

    this.activeCard = CardBuilder.fromTemplate()
      .addIconWithKMarkdownText(CardIcons.IconCute, '')
      .addKMarkdownText('Miku打字中...')
    const { success, data, code } = await Requests.createChannelMessage(
      {
        type: KEventType.Card,
        target_id: this.targetId,
        content: this.activeCard.build(),
        reply_msg_id: this.triggerMessageId || undefined,
      },
      { guildId: this.guildId }
    )
    if (code === 1149) {
      die('Message length upper bound is too low.')
    }
    if (success && data) {
      this.activeMessageId = data.msg_id
    }
    return this.activeCard
  }

  private removingWaitingText(card: CardBuilder) {
    if (!card.lastModule?.text?.content?.includes('Miku打字中...')) {
      return card
    }
    card.undoLastAdd()
    return card
  }

  private async updateActiveCard(nextState: CardBuilder, originalTextContent?: string) {
    this.activeCard = nextState
    if (!this.activeMessageId) {
      return
    }
    Requests.updateChannelMessage(
      {
        msg_id: this.activeMessageId,
        content: this.activeCard.build(),
        reply_msg_id: this.triggerMessageId || undefined,
        extra: {
          type: KEventType.Card,
          target_id: this.targetId,
        },
      },
      { guildId: this.guildId, originalTextContent }
    )
    await sleep(300)
  }

  private finalizeCurrentCard() {
    this.activeCard = null
    this.activeAccumulatedContent = ''
  }

  createTransaction(processor: (session: IDialogueSession) => void) {
    const session: IDialogueSession = {
      update: async (atomicUpdateProcedure, contextToAppend) => {
        let card = await this.ensureActiveCard()
        const snapshot = card.createSnapshot()

        card = await atomicUpdateProcedure(card)

        // 本次更新没超过长度限制，直接更新
        const serializedLength = card.serializedLength
        if (serializedLength < MessageLengthUpperBound) {
          if (contextToAppend) {
            this.activeAccumulatedContent += contextToAppend
          }
          await this.updateActiveCard(card, this.activeAccumulatedContent)
          return
        }

        // 超过长度限制，先回退进度
        card.restore(snapshot)

        // 看看全新的空卡片会不会超
        let emptyCard = CardBuilder.fromTemplate()
        emptyCard = atomicUpdateProcedure(emptyCard)

        // 空卡片也会超过长度限制，报告错误
        if (emptyCard.serializedLength > MessageLengthUpperBound) {
          throw new Error('Message length upper bound is too low.')
        }

        this.finalizeCurrentCard()
        return session.update(atomicUpdateProcedure, contextToAppend)
      },
      commit: () => {
        this.finalizeCurrentCard()
      },
    }
    processor(session)
  }

  async createNonAtomicTextMessage(content: string) {
    const merged = this.activeAccumulatedContent + content
    const activeCard = await this.ensureActiveCard()

    const cardWithMergedContent = this.removingWaitingText(activeCard).addKMarkdownText(merged)
    const serializedLength = cardWithMergedContent.serializedLength
    if (serializedLength < MessageLengthUpperBound) {
      await this.updateActiveCard(cardWithMergedContent, merged)
      this.activeAccumulatedContent += content
      return
    }

    const excess = serializedLength - MessageLengthUpperBound
    let truncatedContent = content.slice(0, content.length - excess)
    let remainingContent = content.slice(truncatedContent.length)

    if (containsUnpairedCodeBlocks(truncatedContent)) {
      truncatedContent += '```'
    }

    if (containsUnpairedCodeBlocks(remainingContent)) {
      remainingContent = '```' + remainingContent
    }

    if (truncatedContent.length > 0) {
      const truncatedMerged = this.activeAccumulatedContent + truncatedContent
      const cardWithTruncatedContent = this.removingWaitingText(activeCard).addKMarkdownText(truncatedMerged)
      await this.updateActiveCard(cardWithTruncatedContent, truncatedMerged)
    }
    this.finalizeCurrentCard()

    await this.createNonAtomicTextMessage(remainingContent)
  }

  async finalize(activeCardPostProcessor: (card: CardBuilder) => CardBuilder = null) {
    if (!this.activeCard || !activeCardPostProcessor) {
      return
    }
    this.createTransaction((session) => {
      session.update(activeCardPostProcessor, this.activeAccumulatedContent)
      session.commit()
    })
    this.finalizeCurrentCard()
  }
}

function containsUnpairedCodeBlocks(text: string) {
  const matches = text.matchAll(/```/g)
  let balance = 0
  for (const match of matches) {
    balance += match.length
  }
  return balance % 2 !== 0
}
