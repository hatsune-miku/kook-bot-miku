import { KEvent, KTextChannelExtra } from '../types'
import { extractContent } from '../utils/content'

/**
 * 指令解析结果
 */
export interface ParsedDirective {
  name: string
  parameter: string | undefined
}

/**
 * 从消息内容中解析指令
 *
 * 指令格式：`/指令名 参数` 或 `/<指令名> 参数`
 *
 * @returns 解析到的指令名和参数，或 undefined（非指令消息）
 */
export function parseDirective(event: KEvent<KTextChannelExtra>): ParsedDirective | undefined {
  const content = extractContent(event).trim()

  if (!content.startsWith('/')) {
    return undefined
  }

  const spaceIndex = content.indexOf(' ')
  let name: string
  let parameter: string | undefined

  if (spaceIndex === -1) {
    name = content.slice(1)
    parameter = undefined
  } else {
    name = content.slice(1, spaceIndex)
    parameter = content.slice(spaceIndex + 1).trim()
    if (parameter === '') {
      parameter = undefined
    }
  }

  if (!name) {
    return undefined
  }

  return { name, parameter }
}
