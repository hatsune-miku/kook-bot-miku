import { UserProperties } from '../chat/directives/types'
import { configUtils } from '../utils/config/config'
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
    const roles = await configUtils.main.userRoles.getUserRoles({ userId })
    const properties = {
      roles: roles.map((role) => role.role),
      metadata: result.data,
    }

    this.userIdToUser.set(userId, properties)
    return properties
  }

  async getUser({ guildId, userId }): Promise<UserProperties> {
    let user = null
    if (this.userIdToUser.has(userId)) {
      user = this.userIdToUser.get(userId)!
    }
    user = await this.queryUser({ guildId, userId })

    configUtils.main.userRoles.getUserRoles({ userId }).then((roles) => {
      if (roles.length > 0) {
        user.roles = roles.map((role) => role.role)
      }
    })

    return user
  }

  async setUser({ userId, user }) {
    this.userIdToUser.set(userId, user)
  }
}

export const kookUserStore = new KookUserStore()
