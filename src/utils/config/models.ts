import { Model } from '@kookapp/klee-core'

export const WhitelistedGuildModel: Model = {
  name: 'kbm_whitelisted_guild',
  version: '1',
  primaryKey: 'guildId',
  fields: [
    {
      name: 'guildId',
      dataType: 'string',
    },
    {
      name: 'name',
      dataType: 'string',
    },
  ],
}

export const ChannelConfigModel: Model = {
  name: 'kbm_channel_config',
  version: '1',
  primaryKey: 'channelId',
  fields: [
    {
      name: 'channelId',
      dataType: 'string',
    },
    {
      name: 'backend',
      dataType: 'string',
    },
    {
      name: 'allowOmittingMentioningMe',
      dataType: 'bool',
    },
  ],
}

export const UserDefinedScriptModel: Model = {
  name: 'kbm_user_defined_script',
  version: '1',
  primaryKey: 'uid',
  fields: [
    {
      name: 'uid',
      dataType: 'string',
    },
    {
      name: 'guildId',
      dataType: 'string',
    },
    {
      name: 'userId',
      dataType: 'string',
    },
    {
      name: 'name',
      dataType: 'string',
    },
    {
      name: 'script',
      dataType: 'string',
    },
  ],
}

export const UserRoleModel: Model = {
  name: 'kbm_user_role',
  version: '1',
  primaryKey: 'uid',
  fields: [
    {
      name: 'uid',
      dataType: 'string',
    },
    {
      name: 'userId',
      dataType: 'string',
    },
    {
      name: 'role',
      dataType: 'string',
    },
  ],
}

export const ContextUnitModel: Model = {
  name: 'kbm_context_unit',
  version: '1',
  primaryKey: 'messageId',
  fields: [
    {
      name: 'guildId',
      dataType: 'string',
    },
    {
      name: 'channelId',
      dataType: 'string',
    },
    {
      name: 'messageId',
      dataType: 'string',
    },
    {
      name: 'role',
      dataType: 'string',
    },
    {
      name: 'authorName',
      dataType: 'string',
    },
    {
      name: 'authorUserId',
      dataType: 'string',
    },
    {
      name: 'content',
      dataType: 'string',
    },
    {
      name: 'createdAt',
      dataType: 'int64',
    },
  ],
}
