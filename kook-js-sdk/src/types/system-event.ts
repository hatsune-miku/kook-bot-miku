import { KUser } from './user'

/**
 * 系统事件扩展字段联合类型
 */
export type KSystemEventExtra =
  | KDeletedMessageEventExtra
  | KUpdatedMessageEventExtra
  | KMessageBtnClickEventExtra
  | KAddedReactionEventExtra
  | KDeletedReactionEventExtra
  | KUpdatedChannelEventExtra
  | KDeletedChannelEventExtra
  | KAddedChannelEventExtra
  | KPinnedMessageEventExtra
  | KUnpinnedMessageEventExtra
  | KJoinedGuildEventExtra
  | KExitedGuildEventExtra
  | KUpdatedGuildEventExtra
  | KSelfJoinedGuildEventExtra
  | KSelfExitedGuildEventExtra
  | KAddedRoleEventExtra
  | KDeletedRoleEventExtra
  | KUpdatedRoleEventExtra
  | KJoinedChannelEventExtra
  | KExitedChannelEventExtra
  | KGuildMemberOnlineEventExtra
  | KGuildMemberOfflineEventExtra
  | KUpdatedGuildMemberEventExtra
  | KUpdatedPrivateMessageEventExtra
  | KDeletedPrivateMessageEventExtra
  | KPrivateAddedReactionEventExtra
  | KPrivateDeletedReactionEventExtra
  | KUserUpdatedEventExtra
  | KUnknownSystemEventExtra

// --- 具体系统事件类型 ---

export interface KDeletedMessageEventExtra {
  type: 'deleted_message'
  body: {
    msg_id: string
    channel_id: string
  }
}

export interface KUpdatedMessageEventExtra {
  type: 'updated_message'
  body: {
    msg_id: string
    channel_id: string
    content: string
    mention: string[]
    mention_all: boolean
    mention_here: boolean
    mention_roles: number[]
    updated_at: number
  }
}

export interface KMessageBtnClickEventExtra {
  type: 'message_btn_click'
  body: {
    msg_id: string
    user_id: string
    value: string
    target_id: string
    user_info: KUser
  }
}

export interface KAddedReactionEventExtra {
  type: 'added_reaction'
  body: {
    msg_id: string
    user_id: string
    channel_id: string
    emoji: {
      id: string
      name: string
    }
  }
}

export interface KDeletedReactionEventExtra {
  type: 'deleted_reaction'
  body: {
    msg_id: string
    user_id: string
    channel_id: string
    emoji: {
      id: string
      name: string
    }
  }
}

export interface KUpdatedChannelEventExtra {
  type: 'updated_channel'
  body: {
    id: string
    name: string
    [key: string]: any
  }
}

export interface KDeletedChannelEventExtra {
  type: 'deleted_channel'
  body: {
    id: string
  }
}

export interface KAddedChannelEventExtra {
  type: 'added_channel'
  body: {
    id: string
    name: string
    [key: string]: any
  }
}

export interface KPinnedMessageEventExtra {
  type: 'pinned_message'
  body: {
    msg_id: string
    channel_id: string
    operator_id: string
  }
}

export interface KUnpinnedMessageEventExtra {
  type: 'unpinned_message'
  body: {
    msg_id: string
    channel_id: string
    operator_id: string
  }
}

export interface KJoinedGuildEventExtra {
  type: 'joined_guild'
  body: {
    user_id: string
    joined_at: number
  }
}

export interface KExitedGuildEventExtra {
  type: 'exited_guild'
  body: {
    user_id: string
    exited_at: number
  }
}

export interface KUpdatedGuildEventExtra {
  type: 'updated_guild'
  body: {
    id: string
    name: string
    [key: string]: any
  }
}

export interface KSelfJoinedGuildEventExtra {
  type: 'self_joined_guild'
  body: {
    guild_id: string
  }
}

export interface KSelfExitedGuildEventExtra {
  type: 'self_exited_guild'
  body: {
    guild_id: string
  }
}

export interface KAddedRoleEventExtra {
  type: 'added_role'
  body: {
    role_id: number
    name: string
  }
}

export interface KDeletedRoleEventExtra {
  type: 'deleted_role'
  body: {
    role_id: number
    name: string
  }
}

export interface KUpdatedRoleEventExtra {
  type: 'updated_role'
  body: {
    role_id: number
    name: string
  }
}

export interface KJoinedChannelEventExtra {
  type: 'joined_channel'
  body: {
    user_id: string
    channel_id: string
    joined_at: number
  }
}

export interface KExitedChannelEventExtra {
  type: 'exited_channel'
  body: {
    user_id: string
    channel_id: string
    exited_at: number
  }
}

export interface KGuildMemberOnlineEventExtra {
  type: 'guild_member_online'
  body: {
    user_id: string
    event_time: number
    guilds: string[]
  }
}

export interface KGuildMemberOfflineEventExtra {
  type: 'guild_member_offline'
  body: {
    user_id: string
    event_time: number
    guilds: string[]
  }
}

export interface KUpdatedGuildMemberEventExtra {
  type: 'updated_guild_member'
  body: {
    user_id: string
    nickname: string
  }
}

export interface KUpdatedPrivateMessageEventExtra {
  type: 'updated_private_message'
  body: {
    msg_id: string
    author_id: string
    target_id: string
    content: string
    updated_at: number
    chat_code: string
  }
}

export interface KDeletedPrivateMessageEventExtra {
  type: 'deleted_private_message'
  body: {
    msg_id: string
    author_id: string
    target_id: string
    chat_code: string
  }
}

export interface KPrivateAddedReactionEventExtra {
  type: 'private_added_reaction'
  body: {
    msg_id: string
    user_id: string
    chat_code: string
    emoji: {
      id: string
      name: string
    }
  }
}

export interface KPrivateDeletedReactionEventExtra {
  type: 'private_deleted_reaction'
  body: {
    msg_id: string
    user_id: string
    chat_code: string
    emoji: {
      id: string
      name: string
    }
  }
}

export interface KUserUpdatedEventExtra {
  type: 'user_updated'
  body: {
    user_id: string
    username: string
    avatar: string
  }
}

/**
 * 未知系统事件的兜底类型
 */
export interface KUnknownSystemEventExtra {
  type: string
  body: Record<string, any>
}
