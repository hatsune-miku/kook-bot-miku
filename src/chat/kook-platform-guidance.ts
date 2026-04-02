const KOOK_PLATFORM_KEYWORDS = [
  'kook',
  'kmarkdown',
  'card',
  '机器人',
  '开发者平台',
  'openapi',
  '接口',
  'api',
  '频道',
  '服务器',
]

export function shouldInjectKookPlatformGuidance(latestUserText: string): boolean {
  const text = (latestUserText || '').toLowerCase()
  if (!text) {
    return false
  }
  return KOOK_PLATFORM_KEYWORDS.some((kw) => text.includes(kw))
}

export const KOOK_PLATFORM_SKILL_GUIDANCE = `
# KOOK 平台能力提示（按需注入）

- 当用户问题涉及 KOOK 开发、消息结构、平台接口时，优先使用 \`kook_platform\` 工具查询真实数据。
- 不要杜撰接口字段、事件结构、错误码；拿不准时先调用工具。
- 对接口结果进行解释时，优先给出可执行步骤和简短示例。
- 若接口返回失败，直接说明失败原因并给出修复建议，不要伪造成功。
`
