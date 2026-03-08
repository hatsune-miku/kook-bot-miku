export type { CardBuilderTemplateOptions, CardBuilder as ICardBuilder } from '@kookapp/js-sdk'

export interface ICardBuilderStatic {
  fromTemplate(options?: import('@kookapp/js-sdk').CardBuilderTemplateOptions): import('@kookapp/js-sdk').CardBuilder
}
