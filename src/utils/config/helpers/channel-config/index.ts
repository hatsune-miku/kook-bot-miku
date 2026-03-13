import { NodeGenericExternalStorage } from '@kookapp/klee-node-toolkit'

import { ChatBotBackends } from '../../../../chat/types'
import { error } from '../../../logging/logger'
import { die } from '../../../server/die'
import { ChannelConfig } from '../../types'

function makeDefaults(channelId: string): ChannelConfig {
  return {
    channelId,
    allowOmittingMentioningMe: false,
    backend: ChatBotBackends.deepseekv31volc,
  }
}

export function createChannelConfigHelper(storage: NodeGenericExternalStorage) {
  const s = storage.activeStorage!
  if (!s) {
    die('createChannelConfigHelper: Storage not initialized')
  }

  async function getChannelConfig({ channelId }): Promise<ChannelConfig | null> {
    const [err, config] = await s.findOne({ where: { channelId } })
    if (err) {
      error(err)
      return null
    }
    return Object.assign({}, makeDefaults(channelId), config)
  }

  async function setChannelConfig(config: ChannelConfig) {
    await s.upsertOne(Object.assign({}, makeDefaults(config.channelId), config))
  }

  async function updateChannelConfig(config: { channelId: string } & Partial<ChannelConfig>) {
    const currentConfig = await getChannelConfig({ channelId: config.channelId })
    if (currentConfig) {
      const keys = Object.keys(config)
      for (const key of keys) {
        config[key] ??= currentConfig[key]
      }
    }
    await setChannelConfig(config as ChannelConfig)
  }

  return {
    getChannelConfig,
    updateChannelConfig,
    setChannelConfig,
  }
}
