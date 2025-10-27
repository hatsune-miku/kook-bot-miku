import { NodeGenericExternalStorage } from '@kookapp/klee-node-toolkit'

import { error } from '../../../logging/logger'
import { die } from '../../../server/die'
import { UserDefinedScript } from '../../types'
import { createUid } from '../../utils'

export function createUserDefinedScriptHelper(storage: NodeGenericExternalStorage) {
  const s = storage.activeStorage!
  if (!s) {
    die('createUserDefinedScriptHelper: Storage not initialized')
  }

  async function findUserDefinedScripts({ guildId, userId, name }: any = {}): Promise<UserDefinedScript[]> {
    const [err, scripts] = await s.findAll({ where: { guildId, userId, name } })
    if (err) {
      error(err)
      return []
    }
    return scripts as UserDefinedScript[]
  }

  async function createUserDefinedScript(script: Omit<UserDefinedScript, 'uid'>) {
    const existing = await findUserDefinedScripts({ guildId: script.guildId, userId: script.userId, name: script.name })
    if (existing.length > 0) {
      return
    }
    await s.insertOne({ uid: createUid(), ...script })
  }

  async function deleteUserDefinedScript(uid: string) {
    await s.delete({ where: { uid }, limit: 1 })
  }

  return {
    findUserDefinedScripts,
    createUserDefinedScript,
    deleteUserDefinedScript,
  }
}
