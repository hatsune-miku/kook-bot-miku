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
import { getExternalConfigPath } from './utils'

import { die } from '../server/die'

export const MessageLengthUpperBound = Math.round(4000 * 0.9)

export interface Config {
  whitelistedGuilds: ReturnType<typeof createWhitelistedGuildHelper>
  channelConfigs: ReturnType<typeof createChannelConfigHelper>
  userDefinedScripts: ReturnType<typeof createUserDefinedScriptHelper>
  userRoles: ReturnType<typeof createUserRoleHelper>
  contextUnits: ReturnType<typeof createContextUnitHelper>
}

export class ConfigUtils {
  private _main: Config

  async initialize() {
    const sqlite3DatabaseFileName = 'memory.db'
    const configMap: Record<keyof Config, [any, (storage: NodeGenericExternalStorage) => any]> = {
      whitelistedGuilds: [WhitelistedGuildModel, createWhitelistedGuildHelper],
      channelConfigs: [ChannelConfigModel, createChannelConfigHelper],
      userDefinedScripts: [UserDefinedScriptModel, createUserDefinedScriptHelper],
      userRoles: [UserRoleModel, createUserRoleHelper],
      contextUnits: [ContextUnitModel, createContextUnitHelper],
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
          externalWorkingDirectory: getExternalConfigPath(),
        },
      })

      const [err] = await storage.initialize()
      if (err) {
        die(`initializeConfig: Failed to initialize storage: ${err}`)
      }

      config[key] = createHelper(storage)
    }

    this._main = config
  }

  get main(): Config {
    return this._main
  }
}

export const configUtils = new ConfigUtils()
