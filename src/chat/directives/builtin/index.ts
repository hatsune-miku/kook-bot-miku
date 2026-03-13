import assign from './assign'
import deleteContext from './delete-context'
import evalDirective from './eval'
import printContext from './print-context'
import query from './query'
import reloadPlugins from './reload-plugins'
import revoke from './revoke'
import setBackend from './set-backend'
import showWhitelist from './show-whitelist'
import unwhitelist from './unwhitelist'
import usingNamespace from './using-namespace'
import whitelist from './whitelist'
import yukiHandler from './yuki-handler'

import { ChatDirectiveItem } from '../types'

export const builtinDirectives = [
  assign,
  deleteContext,
  revoke,
  setBackend,
  showWhitelist,
  unwhitelist,
  whitelist,
  yukiHandler,
  printContext,
  evalDirective,
  usingNamespace,
  query,
  reloadPlugins,
] as ChatDirectiveItem[]
