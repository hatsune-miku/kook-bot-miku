import { KCardMessage, KCardMessageElement, KCardSize } from "../events"

export class CardHelper {}

export interface CardBuilderTemplateOptions {
  initialCard?: Partial<Omit<KCardMessage[0], "modules">>
}

export class CardBuilder {
  private card: KCardMessage = [
    {
      type: "card",
      theme: "secondary",
      size: "lg",
      color: "#fb7299",
      modules: []
    }
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
      initialCard: { theme: "secondary" }
    }
  ) {
    return new CardBuilder(options)
  }

  size(size: KCardSize) {
    this.main.size = size
    return this
  }

  theme(theme: KCardMessageElement["theme"]) {
    this.main.theme = theme
    return this
  }

  color(color: KCardMessageElement["color"]) {
    this.main.color = color
    return this
  }

  addIconWithKMarkdownText(iconUrl: string, text: string) {
    this.modules.push({
      type: "section",
      text: {
        type: "kmarkdown",
        content: text
      },
      mode: "left",
      accessory: {
        type: "image",
        src: iconUrl,
        size: "sm"
      }
    })
    return this
  }

  addImage(imageUrl: string) {
    this.modules.push({
      type: "container",
      elements: [
        {
          type: "image",
          src: imageUrl
        }
      ]
    })
    return this
  }

  addFile(title: string, fileUrl: string, fileSize: number) {
    this.modules.push({
      type: "file",
      title: title,
      src: fileUrl,
      size: `${fileSize}`
    })
    return this
  }

  addKMarkdownText(content: string) {
    this.modules.push({
      type: "section",
      text: {
        type: "kmarkdown",
        content: content
      }
    })
    return this
  }

  addPlainText(text: string) {
    this.modules.push({
      type: "section",
      text: {
        type: "plain-text",
        content: text
      }
    })
    return this
  }

  addDivider() {
    this.modules.push({
      type: "divider"
    })
    return this
  }

  addHourCountDown(endAt: number) {
    this.modules.push({
      type: "countdown",
      mode: "hour",
      endTime: endAt
    })
    return this
  }

  build() {
    return JSON.stringify(this.card)
  }
}

export const CardIcons = {
  MikuCry:
    "https://img.kookapp.cn/emojis/3553226959/42829/7ydOiupsN90m80mb.png",
  MikuCute:
    "https://img.kookapp.cn/emojis/3553226959/42829/gJ7IgeHpHN0rt0rx.png",
  MikuSad:
    "https://img.kookapp.cn/emojis/3553226959/42829/OhGpZwVWpm0dw0dz.png",
  MikuHappy:
    "https://img.kookapp.cn/emojis/3266153385602000/XiuGRap9Do0rt0rx.png"
}
