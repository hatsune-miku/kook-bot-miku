import { StreamingCard, CardBuilder, StreamingCardSession } from '@kookapp/js-sdk'

import { client } from '../../bot'
import { botKookUserStore } from '../../cached-store/bot-kook-user'
import { DisplayName } from '../../global/shared'
import { CardIcons } from '../../helpers/card-helper'
import { MessageLengthUpperBound, configUtils } from '../config/config'

export interface IDialogueSession {
  update(atomicProcedure: (card: CardBuilder) => CardBuilder, contextToAppend?: string): Promise<void>
  commit(): void
}

export class Dialogue {
  private streaming: StreamingCard

  constructor(
    private guildId: string,
    private targetId: string,
    triggerMessageId: string | null = null
  ) {
    this.streaming = new StreamingCard({
      api: client.api,
      targetId,
      maxLength: MessageLengthUpperBound,
      quoteMessageId: triggerMessageId || undefined,
      initialCard: (card) =>
        card.addIconWithKMarkdownText(CardIcons.IconCute, '').addKMarkdownText('Miku打字中...'),
      cardPreprocessor: (card) => {
        if (card.lastModule?.text?.content?.includes('Miku打字中...')) {
          card.undoLastAdd()
        }
        return card
      },
      onMessageCreated: async (msgId, content) => {
        await configUtils.main.contextUnits.createContextUnit({
          guildId: this.guildId,
          channelId: this.targetId,
          authorUserId: botKookUserStore.me.id,
          messageId: msgId,
          authorName: DisplayName,
          role: 'assistant',
          content,
        })
      },
      onMessageUpdated: (msgId, content) => {
        configUtils.main.contextUnits.updateContextUnit({
          guildId: this.guildId,
          channelId: this.targetId,
          messageId: msgId,
          role: 'assistant',
          authorName: DisplayName,
          authorUserId: botKookUserStore.me.id,
          content,
        })
      },
    })
  }

  async initialize() {
    await this.streaming.initialize()
  }

  async createNonAtomicTextMessage(content: string) {
    await this.streaming.appendText(content)
  }

  async createTransaction(processor: (session: IDialogueSession) => Promise<void> | void) {
    await this.streaming.createTransaction(async (session: StreamingCardSession) => {
      const dialogueSession: IDialogueSession = {
        update: async (atomicProcedure, _contextToAppend) => {
          await session.update(atomicProcedure)
        },
        commit: () => {
          session.commit()
        },
      }
      await processor(dialogueSession)
    })
  }

  async finalize(activeCardPostProcessor: ((card: CardBuilder) => CardBuilder) | null = null) {
    await this.streaming.finalize(activeCardPostProcessor)
  }
}
