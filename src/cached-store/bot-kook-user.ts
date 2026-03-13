import { Requests } from '../utils/krequest/request'
import { QuerySelfResult } from '../utils/krequest/types'
import { info, warn } from '../utils/logging/logger'
import { die } from '../utils/server/die'

export class BotKookUserStore {
  private _me: QuerySelfResult

  async initialize() {
    info('Querying self information from KOOK...')
    const querySelfResult = await Requests.querySelfUser()
    const self = querySelfResult.data

    if (!querySelfResult.success) {
      // 写php写的
      die(`Query-self failed: ${querySelfResult.message}`)
    }

    if (!self.bot) {
      warn(`KOOK说我不是bot，震惊!`)
    }

    const displayName = `${self.username}#${self.identify_num}`
    info('I am', displayName, 'with user id', self.id)

    this._me = self
  }

  get me(): QuerySelfResult {
    return this._me
  }
}

export const botKookUserStore = new BotKookUserStore()
