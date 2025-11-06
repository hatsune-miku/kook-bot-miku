import { KCardMessage, KCardMessageElement, KCardSize } from '../events'

export interface CardBuilderTemplateOptions {
  initialCard?: Partial<Omit<KCardMessage[0], 'modules'>>
}

export interface ICardBuilderStatic {
  fromTemplate(options?: CardBuilderTemplateOptions): ICardBuilder
}

export interface ICardBuilder {
  size(size: KCardSize): ICardBuilder
  theme(theme: KCardMessageElement['theme']): ICardBuilder
  color(color: KCardMessageElement['color']): ICardBuilder
  addIconWithKMarkdownText(iconUrl: string, text: string): ICardBuilder
  addImage(imageUrl: string): ICardBuilder
  addFile(title: string, fileUrl: string, fileSize: number): ICardBuilder
  addKMarkdownText(content: string): ICardBuilder
  addPlainText(text: string): ICardBuilder
  addDivider(): ICardBuilder
  addHourCountDown(endAt: number): ICardBuilder
  addContext(content: string): ICardBuilder
  build(): string
}
