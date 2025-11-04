import { IChatDirectivesManager } from '../../types'
import yukiSubCommandHandler from '../../yuki/handler'
import { ChatDirectiveItem, ParseEventResultValid } from '../types'

export default {
  triggerWord: ['yuki', 'yuki-subcommands'],
  parameterDescription: '',
  description: 'Yuki Subcommands',
  defaultValue: undefined,
  permissionGroups: ['everyone'],
  async handler(event: ParseEventResultValid, manager: IChatDirectivesManager) {
    return yukiSubCommandHandler(manager, event)
  },
} satisfies ChatDirectiveItem
