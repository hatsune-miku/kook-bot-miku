export interface ChannelConfig {
  channelId: string
  backend: string
  allowOmittingMentioningMe: boolean
}

export interface UserDefinedScript {
  uid: string
  guildId: string
  userId: string
  name: string
  script: string
}

export interface UserRole {
  uid: string
  userId: string
  role: string
}

export interface ContextUnit {
  guildId: string
  channelId: string
  messageId: string
  role: 'assistant' | 'user'
  authorName: string
  authorUserId: string
  content: string
  createdAt: number
}
