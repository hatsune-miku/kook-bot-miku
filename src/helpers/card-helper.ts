import { CardBuilderTemplateOptions, ICardBuilder } from './types'

import { KCardMessage, KCardMessageElement, KCardSize } from '../events'
import { MessageLengthUpperBound } from '../utils/config/config'

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

  build() {
    return JSON.stringify(this.card)
  }

  /**
   * Build the card, splitting into multiple cards if the content exceeds the length limit.
   * Returns an array of card JSON strings.
   */
  buildSplit(): string[] {
    const singleBuild = this.build()
    if (singleBuild.length <= MessageLengthUpperBound) {
      return [singleBuild]
    }

    // Find the kmarkdown text module(s) that we can split
    const results: string[] = []
    const kmarkdownModules: Array<{ index: number; content: string }> = []

    for (let i = 0; i < this.modules.length; i++) {
      const m = this.modules[i] as any
      if (m.type === 'section' && m.text?.type === 'kmarkdown') {
        kmarkdownModules.push({ index: i, content: m.text.content })
      }
    }

    if (kmarkdownModules.length === 0) {
      // No kmarkdown modules to split, just return the single build
      return [singleBuild]
    }

    // Calculate overhead (everything except kmarkdown content)
    const lastKmarkdownModule = kmarkdownModules[kmarkdownModules.length - 1]
    const testModules = [...this.modules]
    ;(testModules[lastKmarkdownModule.index] as any).text.content = ''
    const testCard = [{ ...this.main, modules: testModules }]
    const overhead = JSON.stringify(testCard).length + 50 // extra buffer for safety

    // Calculate available space for content per card
    const availableSpace = MessageLengthUpperBound - overhead

    // Collect all kmarkdown content
    const allContent = lastKmarkdownModule.content

    // Split the content
    const chunks = splitKMarkdownContent(allContent, availableSpace)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const newModules = [...this.modules]
      const prefixedContent = chunks.length > 1 ? `(${i + 1}/${chunks.length}) ${chunk}` : chunk
      ;(newModules[lastKmarkdownModule.index] as any) = {
        ...(this.modules[lastKmarkdownModule.index] as any),
        text: {
          type: 'kmarkdown',
          content: prefixedContent,
        },
      }
      const newCard = [{ ...this.main, modules: newModules }]
      results.push(JSON.stringify(newCard))
    }

    return results
  }
}

/**
 * Split kmarkdown content into chunks, preserving code block integrity
 */
function splitKMarkdownContent(content: string, maxLength: number): string[] {
  if (content.length <= maxLength) {
    return [content]
  }

  const chunks: string[] = []
  let remaining = content
  let inCodeBlock = false

  while (remaining.length > 0) {
    let chunkEnd = Math.min(remaining.length, maxLength)

    // Account for prefix like "(1/3) " which takes about 10 chars
    const prefixReserve = 10
    chunkEnd = Math.min(remaining.length, maxLength - prefixReserve)

    if (chunkEnd < remaining.length) {
      // Try to find a good break point (newline, space)
      let breakPoint = remaining.lastIndexOf('\n', chunkEnd)
      if (breakPoint < chunkEnd * 0.5) {
        breakPoint = remaining.lastIndexOf(' ', chunkEnd)
      }
      if (breakPoint > chunkEnd * 0.5) {
        chunkEnd = breakPoint + 1
      }
    }

    let chunk = remaining.slice(0, chunkEnd)
    remaining = remaining.slice(chunkEnd)

    // Handle code blocks: count ``` in this chunk
    const codeBlockMatches = chunk.match(/```/g) || []
    const codeBlockCount = codeBlockMatches.length

    if (inCodeBlock) {
      // We're continuing from a code block, prepend ```
      chunk = '```\n' + chunk
    }

    // Update inCodeBlock state
    if (codeBlockCount % 2 !== 0) {
      inCodeBlock = !inCodeBlock
    }

    if (inCodeBlock && remaining.length > 0) {
      // We're ending mid-code-block, append ```
      chunk = chunk + '\n```'
    }

    chunks.push(chunk.trim())
  }

  return chunks
}

export const CardIcons = {
  IconCry: 'https://img.kookapp.cn/emojis/3553226959/42829/7ydOiupsN90m80mb.png',
  IconCute: 'https://img.kookapp.cn/emojis/3553226959/42829/gJ7IgeHpHN0rt0rx.png',
  IconSad: 'https://img.kookapp.cn/emojis/3553226959/42829/OhGpZwVWpm0dw0dz.png',
  IconHappy: 'https://img.kookapp.cn/emojis/3266153385602000/XiuGRap9Do0rt0rx.png',
}
