import { UserProperties } from '../chat/directives'
import { ConfigUtils } from '../utils/config/config'
import { Requests } from '../utils/krequest/request'

export class KookUserStore {
  private userIdToUser = new Map<string, UserProperties>()

  async queryUser({ guildId, userId }): Promise<UserProperties> {
    const result = await Requests.queryUser({
      guild_id: guildId,
      user_id: userId,
    })
    if (!result.success) {
      throw new Error(`User request failed: ${result.message}`)
    }
    const roles = await ConfigUtils.main.userRoles.getUserRoles({ userId })
    const properties = {
      roles: roles.map((role) => role.role),
      metadata: result.data,
    }

    this.userIdToUser.set(userId, properties)
    return properties
  }

  async getUser({ guildId, userId }): Promise<UserProperties> {
    if (this.userIdToUser.has(userId)) {
      return this.userIdToUser.get(userId)!
    }
    return this.queryUser({ guildId, userId })
  }

  async setUser({ userId, user }) {
    this.userIdToUser.set(userId, user)
  }
}

export const kookUserStore = new KookUserStore()
