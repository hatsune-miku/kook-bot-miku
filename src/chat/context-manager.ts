import ConfigUtils from "../utils/config/config"
import { ContextUnit } from "./types"

export class ContextManager {
  getContext(
    guildId: string,
    channelId: string,
    userId: string
  ): ContextUnit[] {
    const channelConfig = ConfigUtils.getChannelConfig(guildId, channelId)
    channelConfig.userIdToContextUnits ??= {}
    return channelConfig.userIdToContextUnits?.[userId] ?? []
  }

  getMixedContext(
    guildId: string,
    channelId: string,
    includesFreeChat: boolean
  ): ContextUnit[] {
    const channelConfig = ConfigUtils.getChannelConfig(guildId, channelId)
    channelConfig.userIdToContextUnits ??= {}
    const userIdToContexts = channelConfig.userIdToContextUnits ?? {}
    const units: ContextUnit[] = []

    for (let userId of Object.keys(userIdToContexts)) {
      const context = userIdToContexts[userId]
      for (const unit of context) {
        if (!unit.freeChat || includesFreeChat) {
          units.push(unit)
        }
      }
    }
    units.sort((a, b) => a.timestamp - b.timestamp)
    const limit = includesFreeChat ? 12 : 12
    if (units.length > limit) {
      return units.slice(units.length - limit)
    }
    return units
  }

  deleteMessageFromContext(
    guildId: string,
    channelId: string,
    messageId: string
  ) {
    ConfigUtils.updateChannelConfig(guildId, channelId, (config) => {
      const userIdToContextUnits = config.userIdToContextUnits || {}
      for (const userId of Object.keys(userIdToContextUnits)) {
        const context = userIdToContextUnits[userId]
        for (let i = 0; i < context.length; ++i) {
          if (context[i].messageId === messageId) {
            context.splice(i, 1)
            break
          }
        }
      }
      return {
        ...config,
        userIdToContextUnits: userIdToContextUnits
      }
    })
  }

  appendToContext(
    guildId: string,
    channelId: string,
    userId: string,
    messageId: string,
    displayName: string,
    role: ContextUnit["role"],
    content: ContextUnit["content"],
    freeChat: ContextUnit["freeChat"]
  ) {
    const context = this.getContext(guildId, channelId, userId)
    context.push({
      id: userId,
      messageId: messageId,
      role: role,
      name: displayName,
      content: content,
      timestamp: Date.now(),
      freeChat: freeChat
    })

    if (context.length > 12) {
      context.splice(0, context.length - 12)
    }

    ConfigUtils.updateChannelConfig(guildId, channelId, (config) => {
      const userIdToContextUnits = config.userIdToContextUnits ?? {}
      userIdToContextUnits[userId] = context
      return {
        ...config,
        userIdToContextUnits: userIdToContextUnits
      }
    })
  }

  updateExistingContext(
    guildId: string,
    channelId: string,
    userId: string,
    messageId: string,
    displayName: string,
    role: ContextUnit["role"],
    content: ContextUnit["content"],
    freeChat: ContextUnit["freeChat"]
  ) {
    const context = this.getContext(guildId, channelId, userId)
    const existingContext = context.find((unit) => unit.messageId === messageId)

    if (!existingContext) {
      return
    }

    existingContext.name = displayName
    existingContext.role = role
    existingContext.content = content
    existingContext.timestamp = Date.now()
    existingContext.freeChat = freeChat

    ConfigUtils.updateChannelConfig(guildId, channelId, (config) => {
      const userIdToContextUnits = config.userIdToContextUnits ?? {}
      userIdToContextUnits[userId] = context
      return {
        ...config,
        userIdToContextUnits: userIdToContextUnits
      }
    })
  }

  setContext(
    guildId: string,
    channelId: string,
    userId: string,
    context: ContextUnit[]
  ) {
    ConfigUtils.updateChannelConfig(guildId, channelId, (config) => {
      const userIdToContextUnits = config.userIdToContextUnits ?? {}
      userIdToContextUnits[userId] = context
      return {
        ...config,
        userIdToContextUnits: userIdToContextUnits
      }
    })
  }

  removeContext(guildId: string, channelId: string) {
    ConfigUtils.updateChannelConfig(guildId, channelId, (config) => {
      return {
        ...config,
        userIdToContextUnits: {}
      }
    })
  }
}
