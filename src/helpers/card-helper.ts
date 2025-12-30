import { cloneDeep } from 'lodash'

import { CardBuilderTemplateOptions, ICardBuilder } from './types'

import { KCardMessage, KCardMessageElement, KCardSize } from '../events'

export interface CardSnapshot {
  card: KCardMessage
}

export class CardBuilder implements ICardBuilder {
  private card: KCardMessage = [
    {
      type: 'card',
      theme: 'secondary',
      size: 'lg',
      color: '#fb7299',
      modules: [],
    },
  ]
  private main = this.card[0]
  private modules = this.card[0].modules

  private constructor(options: CardBuilderTemplateOptions) {
    if (options.initialCard) {
      this.card[0] = { ...this.card[0], ...options.initialCard }
    }
  }

  static fromTemplate(
    options: CardBuilderTemplateOptions = {
      initialCard: { theme: 'secondary' },
    }
  ) {
    return new CardBuilder(options)
  }

  restore(snapshot: CardSnapshot) {
    this.card = snapshot.card
    this.main = this.card[0]
    this.modules = this.card[0].modules
    return this
  }

  size(size: KCardSize) {
    this.main.size = size
    return this
  }

  theme(theme: KCardMessageElement['theme']) {
    this.main.theme = theme
    return this
  }

  color(color: KCardMessageElement['color']) {
    this.main.color = color
    return this
  }

  addIconWithKMarkdownText(iconUrl: string, text: string) {
    this.modules.push({
      type: 'section',
      text: {
        type: 'kmarkdown',
        content: text,
      },
      mode: 'left',
      accessory: {
        type: 'image',
        src: iconUrl,
        size: 'sm',
      },
    })
    return this
  }

  addImage(imageUrl: string) {
    this.modules.push({
      type: 'container',
      elements: [
        {
          type: 'image',
          src: imageUrl,
        },
      ],
    })
    return this
  }

  addFile(title: string, fileUrl: string, fileSize: number) {
    this.modules.push({
      type: 'file',
      title: title,
      src: fileUrl,
      size: `${fileSize}`,
    })
    return this
  }

  addKMarkdownText(content: string) {
    this.modules.push({
      type: 'section',
      text: {
        type: 'kmarkdown',
        content: content,
      },
    })
    return this
  }

  addPlainText(text: string) {
    this.modules.push({
      type: 'section',
      text: {
        type: 'plain-text',
        content: text,
      },
    })
    return this
  }

  addDivider() {
    this.modules.push({
      type: 'divider',
    })
    return this
  }

  addHourCountDown(endAt: number) {
    this.modules.push({
      type: 'countdown',
      mode: 'hour',
      endTime: endAt,
    })
    return this
  }

  addContext(content: string) {
    this.modules.push({
      type: 'context',
      elements: [{ type: 'plain-text', content }],
    })
    return this
  }

  addKMarkdownContext(content: string) {
    this.modules.push({
      type: 'context',
      elements: [{ type: 'kmarkdown', content }] as any,
    })
    return this
  }

  undoLastAdd() {
    if (this.modules.length > 0) {
      this.modules.pop()
    }
    return this
  }

  get serializedLength() {
    return JSON.stringify(this.card).length
  }

  get lastModule() {
    return this.modules[this.modules.length - 1]
  }

  build() {
    return JSON.stringify(this.card)
  }

  createSnapshot(): CardSnapshot {
    return {
      card: cloneDeep(this.card),
    }
  }
}

export const CardIcons = {
  IconCry: 'https://img.kookapp.cn/emojis/3553226959/42829/7ydOiupsN90m80mb.png',
  IconCute: 'https://img.kookapp.cn/emojis/3553226959/42829/gJ7IgeHpHN0rt0rx.png',
  IconSad: 'https://img.kookapp.cn/emojis/3553226959/42829/OhGpZwVWpm0dw0dz.png',
  IconHappy: 'https://img.kookapp.cn/emojis/3266153385602000/XiuGRap9Do0rt0rx.png',
}
