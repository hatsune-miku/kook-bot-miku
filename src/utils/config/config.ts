import path from 'path'

import { NodeGenericExternalStorage } from '@kookapp/klee-node-toolkit'

import { createChannelConfigHelper } from './helpers/channel-config'
import { createContextUnitHelper } from './helpers/context-unit'
import { createUserDefinedScriptHelper } from './helpers/user-defined-script'
import { createUserRoleHelper } from './helpers/user-role'
import { createWhitelistedGuildHelper } from './helpers/whitelisted-guild'
import {
  ChannelConfigModel,
  ContextUnitModel,
  UserDefinedScriptModel,
  UserRoleModel,
  WhitelistedGuildModel,
} from './models'

export const MessageLengthUpperBound = Math.round(4000 * 0.9)

export interface Config {
  whitelistedGuilds: ReturnType<typeof createWhitelistedGuildHelper>
  channelConfigs: ReturnType<typeof createChannelConfigHelper>
  userDefinedScripts: ReturnType<typeof createUserDefinedScriptHelper>
  userRoles: ReturnType<typeof createUserRoleHelper>
  contextUnits: ReturnType<typeof createContextUnitHelper>
}

export async function initializeConfig(): Promise<Config> {
  const sqlite3DatabaseFileName = 'memory.db'
  const configMap = {
    whitelistedGuilds: [WhitelistedGuildModel, createWhitelistedGuildHelper],
    channelConfigs: [ChannelConfigModel, createChannelConfigHelper],
    userDefinedScripts: [UserDefinedScriptModel, createUserDefinedScriptHelper],
    userRoles: [UserRoleModel, createUserRoleHelper],
    contextUnitStorage: [ContextUnitModel, createContextUnitHelper],
  }

  const keys = Object.keys(configMap)
  const config: Config = {} as Config

  for (const key of keys) {
    const [model, createHelper] = configMap[key]
    const storage = new NodeGenericExternalStorage({
      isNode: true,
      model,
      storageOptions: {
        sqlite3DatabaseFileName,
        externalWorkingDirectory: path.join(process.cwd(), 'config'),
      },
    })

    await storage.initialize()
    config[key] = createHelper(storage)
  }

  return config
}

export const ConfigUtils: { main: Config } = {
  main: null,
}
