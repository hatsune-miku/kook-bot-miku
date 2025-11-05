import yukiSubCommandHandler from '../../yuki/handler'
import { ChatDirectiveItem, IChatDirectivesManager, ParseEventResultValid } from '../types'

export default {
  triggerWord: ['yuki', 'yuki-subcommands'],
  parameterDescription: '',
  description: 'Yuki Subcommands',
  defaultValue: undefined,
  permissionGroups: ['everyone'],
  withContext: false,
  async handler(event: ParseEventResultValid, manager: IChatDirectivesManager) {
    return yukiSubCommandHandler(manager, event)
  },
} satisfies ChatDirectiveItem
