import { sleep } from 'radash'

import { Requests } from './request'

import { CardBuilder, CardIcons } from '../../helpers/card-helper'
import { KEventType } from '../../websocket/kwebsocket/types'
import { MessageLengthUpperBound } from '../config/config'
import { die } from '../server/die'

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

  private async updateActiveCard(nextState: CardBuilder, originalTextContent: string) {
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

  async appendContent(content: string) {
    const merged = this.activeAccumulatedContent + content
    const activeCard = await this.ensureActiveCard()

    const cardWithMergedContent = activeCard.undoLastAdd().addKMarkdownText(merged)
    const serializedLength = cardWithMergedContent.serializedLength
    if (serializedLength < MessageLengthUpperBound) {
      await this.updateActiveCard(cardWithMergedContent, merged)
      this.activeAccumulatedContent += content
      return
    }

    const excess = serializedLength - MessageLengthUpperBound
    const truncatedContent = content.slice(0, content.length - excess)
    if (truncatedContent.length > 0) {
      const truncatedMerged = this.activeAccumulatedContent + truncatedContent
      const cardWithTruncatedContent = activeCard.undoLastAdd().addKMarkdownText(truncatedMerged)
      await this.updateActiveCard(cardWithTruncatedContent, truncatedMerged)
    }
    this.finalizeCurrentCard()

    const remainingContent = content.slice(truncatedContent.length)
    await this.appendContent(remainingContent)
  }

  async finalize() {
    this.finalizeCurrentCard()
  }
}
