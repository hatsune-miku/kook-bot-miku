import Pako from 'pako'

import { KMessage } from '../types/message-kind'

/**
 * 解压 KOOK WebSocket 消息
 *
 * KOOK 使用 DEFLATE 压缩，通过 pako 解压后解析 JSON
 *
 * @returns 解压后的消息对象，解压或解析失败时返回 null
 */
export function decompressKMessage<T>(data: Pako.Data): KMessage<T> | null {
  try {
    const decompressed = Pako.inflate(data, { to: 'string' })
    return JSON.parse(decompressed) as KMessage<T>
  } catch {
    return null
  }
}
