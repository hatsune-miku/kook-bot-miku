import { dispatchCardButtonEvent } from './shared'

import { configUtils } from '../../utils/config/config'
import { KCardButtonExtra, KEvent, KSystemEventExtra } from '../../websocket/kwebsocket/types'

export function handleSystemEvent(event: KEvent<KSystemEventExtra>) {
  const extra = event.extra
  const guildId = event.target_id

  if (!guildId) {
    return
  }

  switch (extra.type) {
    case 'deleted_message': {
      if (extra.body.channel_id && extra.body.msg_id) {
        configUtils.main.contextUnits.deleteContextUnit({
          guildId,
          channelId: extra.body.channel_id,
          messageId: extra.body.msg_id,
        })
      }
      break
    }

    case 'message_btn_click': {
      dispatchCardButtonEvent(event as KEvent<KCardButtonExtra>)
    }
  }
}
