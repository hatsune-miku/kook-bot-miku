/**
 * 卡片消息尺寸
 */
export const KCardSizes = ['sm', 'md', 'lg'] as const
export type KCardSize = (typeof KCardSizes)[number]

/**
 * 卡片主题
 */
export const KCardThemes = ['primary', 'secondary', 'warning', 'danger', 'info', 'invisible', 'none'] as const
export type KCardTheme = (typeof KCardThemes)[number]

/**
 * 卡片文本元素
 */
export interface KCardTextElement {
  type: 'kmarkdown' | 'plain-text'
  content: string
}

/**
 * 卡片内嵌元素（图片、文件等）
 */
export interface KCardContainedElement {
  type: 'image' | 'file' | 'plain-text' | 'kmarkdown' | 'button'
  title?: string
  src?: string
  size?: KCardSize | string
  content?: string
  theme?: string
  value?: string
  text?: KCardTextElement
}

/**
 * 卡片模块（section, container, divider 等）
 */
export interface KCardModule {
  type: string
  text?: KCardTextElement
  mode?: string
  accessory?: KCardContainedElement
  elements?: KCardContainedElement[]
  [key: string]: any
}

/**
 * 卡片元素
 */
export interface KCardElement {
  type: 'card'
  theme: KCardTheme
  size: KCardSize
  color?: string
  modules: KCardModule[]
}

/**
 * 卡片消息（发送给 API 的格式是 JSON 数组）
 */
export type KCardMessage = [KCardElement]

/**
 * 卡片按钮 value 字段的约定结构
 */
export interface KCardButtonValue {
  kind: string
  args: string[]
}
