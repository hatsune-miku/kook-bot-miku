import { NodeGenericExternalStorage } from '@kookapp/klee-node-toolkit'

import { error } from '../../../logging/logger'
import { die } from '../../../server/die'
import { WorkLog } from '../../types'
import { createUid } from '../../utils'

export function createWorkLogHelper(storage: NodeGenericExternalStorage) {
  const s = storage.activeStorage!
  if (!s) {
    die('createWorkLogHelper: Storage not initialized')
  }

  async function addWorkLog({ userId, content }: { userId: string; content: string }) {
    await s.insertOne({
      uid: createUid(),
      userId,
      content,
      createdAt: Date.now(),
    })
  }

  async function getWorkLogs({ userId, since }: { userId: string; since: number }): Promise<WorkLog[]> {
    const [err, logs] = await s.findAll({ where: { userId } })
    if (err) {
      error(err)
      return []
    }
    return (logs as WorkLog[]).filter((log) => log.createdAt >= since)
  }

  return { addWorkLog, getWorkLogs }
}
