import { scheduleJob } from 'node-schedule'
import { shuffle } from 'radash'

import { CardBuilder, CardIcons } from '../../helpers/card-helper'
import ConfigUtils from '../../utils/config/config'
import { Requests } from '../../utils/krequest/request'
import { KResponseWeak } from '../../utils/krequest/types'
import { info } from '../../utils/logging/logger'
import { KCardButtonValue, KEventType, KUser } from '../../websocket/kwebsocket/types'
import { normalizeTime } from '../utils/time'

export interface CreateCodeBlockPayload {
  code: string
  markdownCodeLanguage: string
  language: string
  guildId: string
  channelId: string
}

export interface CodeBlock extends CreateCodeBlockPayload {
  id: string
}

const activeCodeBlocks: CodeBlock[] = []

export function createCodeBlock(payload: CreateCodeBlockPayload): CodeBlock {
  const uuid = crypto.randomUUID()
  const codeBlock: CodeBlock = {
    id: uuid,
    ...payload,
  }
  activeCodeBlocks.push(codeBlock)
  Requests.createChannelMessage(
    {
      type: KEventType.Card,
      target_id: payload.channelId,
      content: createCodeExecutedMessageCard(codeBlock),
    },
    { guildId: payload.guildId }
  )
  return codeBlock
}

export function getCodeBlock(id: string): CodeBlock | undefined {
  return activeCodeBlocks.find((c) => c.id === id)
}

export function viewCodeBlock(currentUser: KUser, channelId: string, id: string) {
  const codeBlock = getCodeBlock(id)
  if (!codeBlock) {
    Requests.createChannelPrivateMessage({
      cardBuilder: CardBuilder.fromTemplate().addIconWithKMarkdownText(CardIcons.MikuSad, '代码数据已被清理'),
      targetUserId: currentUser.id,
      channelId: channelId,
    })
    return
  }
  Requests.createChannelPrivateMessage({
    cardBuilder: CardBuilder.fromTemplate()
      .addIconWithKMarkdownText(CardIcons.MikuCute, `代码语言：${codeBlock.language}`)
      .addKMarkdownText(`\`\`\`${codeBlock.markdownCodeLanguage}\n${codeBlock.code}\`\`\``),
    targetUserId: currentUser.id,
    channelId: channelId,
  })
}

export function createCodeExecutedMessageCard(codeBlock: CodeBlock): string {
  const card = [
    {
      type: 'card',
      theme: 'secondary',
      color: '#fb7299',
      size: 'lg',
      modules: [
        {
          type: 'section',
          text: {
            type: 'plain-text',
            content: `已执行 ${codeBlock.language} 代码`,
          },
          mode: 'left',
          accessory: {
            type: 'image',
            size: 'lg',
            src: CardIcons.MikuCute,
          },
        },
        {
          type: 'section',
          text: {
            type: 'kmarkdown',
            content: '(font)代码片段不会永久保留，请及时查看~(font)[secondary]',
          },
          mode: 'right',
          accessory: {
            type: 'button',
            theme: 'secondary',
            value: JSON.stringify({
              kind: 'code-view',
              args: [codeBlock.id],
            } as KCardButtonValue),
            click: 'return-val',
            text: {
              type: 'plain-text',
              content: '查看代码',
            },
          },
        },
      ],
    },
  ]
  return JSON.stringify(card)
}
