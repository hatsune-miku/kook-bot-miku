import { NodeGenericExternalStorage } from '@kookapp/klee-node-toolkit'

import { error } from '../../../logging/logger'
import { die } from '../../../server/die'

export function createWhitelistedGuildHelper(storage: NodeGenericExternalStorage) {
  const s = storage.activeStorage!
  if (!s) {
    die('createWhitelistedGuildHelper: Storage not initialized')
  }

  async function isGuildWhitelisted({ guildId }) {
    const [err, count] = await s.count({ where: { guildId } })
    if (err) {
      error(err)
      return false
    }
    return count ? count > 0 : false
  }

  async function addWhitelistedGuild({ guildId, name }) {
    if (await isGuildWhitelisted({ guildId })) {
      return
    }
    await s.insertOne({ guildId, name })
  }

  async function removeWhitelistedGuild({ guildId }) {
    await s.delete({ where: { guildId }, limit: 1 })
  }

  return {
    isGuildWhitelisted,
    addWhitelistedGuild,
    removeWhitelistedGuild,
  }
}
