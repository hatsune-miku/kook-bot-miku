/**
 * KOOK 消息/事件类型
 */
export const KEventTypes = {
  Text: 1,
  Image: 2,
  Video: 3,
  File: 4,
  Audio: 8,
  KMarkdown: 9,
  Card: 10,
  System: 255,
} as const

export type KEventType = (typeof KEventTypes)[keyof typeof KEventTypes]
