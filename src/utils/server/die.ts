import { botEventEmitter } from '../../events'
import { DisplayName } from '../../global/shared'
import { KResponseExt } from '../krequest/types'
import { error } from '../logging/logger'

export function die(reason: string): never {
  botEventEmitter.emit('send-lark-message', {
    title: `${DisplayName} Event`,
    message: 'Severe Error: ' + reason,
  })

  error(reason)
  error('Exiting...')
  process.exit(1)
}

export function successOrDie(res: KResponseExt<any>, reason?: string) {
  reason ||= '请求失败'
  if (!res.success) {
    die(reason)
  }
}
