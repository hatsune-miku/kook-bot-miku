import { NodeGenericExternalStorage } from '@kookapp/klee-node-toolkit'

import { error } from '../../../logging/logger'
import { die } from '../../../server/die'
import { UserRole } from '../../types'
import { createUid } from '../../utils'

export function createUserRoleHelper(storage: NodeGenericExternalStorage) {
  const s = storage.activeStorage!
  if (!s) {
    die('createUserRoleHelper: Storage not initialized')
  }

  async function getUserRoles({ userId }): Promise<UserRole[]> {
    const [err, roles] = await s.findAll({ where: { userId } })
    if (err) {
      error(err)
      return []
    }
    return roles as UserRole[]
  }

  async function assignUserRole(role: Omit<UserRole, 'uid'>) {
    const existing = await getUserRoles({ userId: role.userId })
    if (existing.find((r) => r.role === role.role)) {
      return
    }
    await s.insertOne({ uid: createUid(), ...role })
  }

  async function revokeUserRole(role: Omit<UserRole, 'uid'>) {
    await s.delete({ where: role, limit: 1 })
  }

  async function deleteUser({ userId }) {
    await s.delete({ where: { userId }, limit: 1 })
  }

  return { getUserRoles, assignUserRole, revokeUserRole, deleteUser }
}
