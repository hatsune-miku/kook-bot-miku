import { KEvent, KTextChannelExtra } from '../types'

/**
 * 检查事件消息是否显式 @了 Bot
 */
export function isExplicitlyMentioningBot(event: KEvent<KTextChannelExtra>, botId: string): boolean {
  if (!event.extra?.mention) {
    return false
  }
  return event.extra.mention.includes(botId)
}

/**
 * 移除 KMarkdown 中指定标签包裹的内容
 *
 * @example removingKMarkdownLabels('hello (met)123(met) world', ['met']) => 'hello  world'
 */
export function removingKMarkdownLabels(content: string, labels: string[]): string {
  return labels
    .reduce((acc, label) => {
      try {
        const regex = new RegExp(`\\(${label}\\).+?\\(${label}\\)`, 'g')
        return acc.replace(regex, '')
      } catch {
        return acc
      }
    }, content)
    .trim()
}

/**
 * 从事件中提取纯文本内容
 *
 * 移除 KMarkdown 标签（met、rol）并还原转义字符
 */
export function extractContent(event: KEvent<KTextChannelExtra>): string {
  const labels = ['rol', 'met']
  let content = event.content

  for (const label of labels) {
    try {
      const regex = new RegExp(`\\(${label}\\).+?\\(${label}\\)`, 'g')
      content = content.replace(regex, '')
    } catch {
      // 无效的正则表达式，跳过
    }
  }

  const replacements: [RegExp, string][] = [
    [/\\\(/g, '('],
    [/\\\)/g, ')'],
    [/\\\[/g, '['],
    [/\\\]/g, ']'],
    [/\\\{/g, '{'],
    [/\\\}/g, '}'],
  ]

  for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement)
  }

  return content.trim()
}
