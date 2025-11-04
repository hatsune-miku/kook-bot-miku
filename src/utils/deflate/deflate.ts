import Pako from 'pako'

import { KMessage } from '../../websocket/kwebsocket/types'

/**
 * pako pako! \^-^/
 *
 * @throws
 */
export function decompressKMessage<T>(data: Pako.Data): KMessage<T> {
  const decompressed = Pako.inflate(data, { to: 'string' })
  return JSON.parse(decompressed) as KMessage<T>
}
