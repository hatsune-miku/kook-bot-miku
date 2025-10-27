import { NodeGenericExternalStorage } from '@kookapp/klee-node-toolkit'

import { error } from '../../../logging/logger'
import { die } from '../../../server/die'
import { ContextUnit } from '../../types'

export function createContextUnitHelper(storage: NodeGenericExternalStorage) {
  const s = storage.activeStorage!
  if (!s) {
    die('createContextUnitHelper: Storage not initialized')
  }

  async function getContextUnits({ guildId, channelId }): Promise<ContextUnit[]> {
    const [err, units] = await s.findAll({ where: { guildId, channelId } })
    if (err) {
      error(err)
      return []
    }
    return units as ContextUnit[]
  }

  async function isContextUnitExists({ guildId, channelId, messageId }): Promise<boolean> {
    const [err, count] = await s.count({ where: { guildId, channelId, messageId } })
    if (err) {
      error(err)
      return false
    }
    return count ? count > 0 : false
  }

  async function createContextUnit(unit: Omit<ContextUnit, 'createdAt'>) {
    await s.upsertOne({ ...unit, createdAt: Date.now() })
  }

  async function clearContextUnits({ guildId, channelId }: any = {}) {
    await s.delete({ where: { guildId, channelId } })
  }

  return {
    getContextUnits,
    isContextUnitExists,
    createContextUnit,
    clearContextUnits,
  }
}
