import { KCardButtonExtra, KCardButtonValue, KEvent } from '@kookapp/js-sdk'

import { warn } from '../../utils/logging/logger'

export async function dispatchCardButtonEvent(event: KEvent<KCardButtonExtra>) {
  let value: KCardButtonValue

  if (!event.extra?.body?.user_info) {
    warn('No user info in event')
    return
  }

  const eventBody = event.extra.body

  try {
    value = JSON.parse(eventBody.value || '{}')
  } catch (e) {
    warn('Failed to parse card button value', e)
    return
  }
  void value
}
