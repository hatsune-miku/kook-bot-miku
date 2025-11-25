import { NodeGenericExternalStorage } from '@kookapp/klee-node-toolkit'

import { error, info } from '../../../logging/logger'
import { die } from '../../../server/die'
import { UserDefinedScript } from '../../types'
import { createUid } from '../../utils'

export function createUserDefinedScriptHelper(storage: NodeGenericExternalStorage) {
  const s = storage.activeStorage!
  if (!s) {
    die('createUserDefinedScriptHelper: Storage not initialized')
  }

  async function findUserDefinedScripts({ guildId, userId, name }: any = {}): Promise<UserDefinedScript[]> {
    const [, alls] = await s.findAll({})
    info('[user-defined-script] all scripts', JSON.stringify(alls))

    const [err, scripts] = await s.findAll({ where: { guildId, userId, name } })
    if (err) {
      error(err)
      return []
    }
    info('[user-defined-script] found scripts', scripts.length)
    return scripts as UserDefinedScript[]
  }

  async function createUserDefinedScript(script: Omit<UserDefinedScript, 'uid'>) {
    const existing = await findUserDefinedScripts({ guildId: script.guildId, userId: script.userId, name: script.name })
    if (existing.length > 0) {
      await s.delete({ where: { guildId: script.guildId, userId: script.userId, name: script.name }, limit: 1 })
      info('[user-defined-script] script already exists. Overwriting...')
    }
    info('[user-defined-script] creating script', script.name)
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
