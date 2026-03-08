// --- Core ---
export { KookClient } from './client/client'
export type { KookClientConfig } from './client/types'

// --- HTTP ---
export { RestClient } from './http/rest-client'
export type { RestClientConfig } from './http/rest-client'
export { RateLimiter, extractRateLimitHeader } from './http/rate-limiter'

// --- WebSocket ---
export { WsClient } from './ws/ws-client'
export type { WsClientConfig } from './ws/ws-client'
export { TimerManager } from './ws/timer-manager'
export type { WsClientEventMap, WsClientEventName } from './ws/ws-events'

// --- Helpers ---
export { CardBuilder } from './helpers/card-builder'
export type { CardSnapshot, CardBuilderTemplateOptions } from './helpers/card-builder'
export { extractContent, isExplicitlyMentioningBot, removingKMarkdownLabels } from './helpers/content'

// --- Directive ---
export { DirectiveRegistry } from './directive/registry'
export { DirectiveDispatcher } from './directive/dispatcher'
export type { DirectiveDispatcherConfig } from './directive/dispatcher'
export { parseDirective } from './directive/parser'
export type { ParsedDirective } from './directive/parser'
export type { DirectiveItem, DirectiveHandler, DirectiveContext, PermissionResolver } from './directive/types'

// --- Plugin ---
export { PluginLoader } from './plugin/loader'
export type { KookPlugin, PluginContext, PluginLogger } from './plugin/types'

// --- Utils ---
export { createLogger } from './utils/logger'
export type { Logger, LoggerConfig, LogLevel, LogHandler } from './utils/logger'
export { queryFromObject } from './utils/query'
export { decompressKMessage } from './utils/compression'
export { PriorityQueue } from './utils/priority-queue'
export { KMessageQueue } from './utils/message-queue'
export { TaskQueue } from './utils/task-queue'

// --- Types ---
export type {
  KMessage,
  KMessageKind,
  KEventType,
  KEvent,
  ChannelType,
  KUser,
  KSelfUser,
  KUserDetail,
  KTextChannelExtra,
  KGuild,
  KRole,
  KSystemEventExtra,
  KDeletedMessageEventExtra,
  KMessageBtnClickEventExtra,
  KDeletedMessageSystemEventExtra,
  KCardButtonExtra,
  KCardSize,
  KCardTheme,
  KCardTextElement,
  KCardContainedElement,
  KCardModule,
  KCardElement,
  KCardMessage,
  KCardButtonValue,
  KWSState,
  OpenGatewayProps,
  KHandshakeMessage,
  KResumeAckMessage,
  WsTimingConfig,
  KResponse,
  KResponseExt,
  KResponseWeak,
  KRateLimitHeader,
  RequestMethod,
  KGatewayResult,
  CreateMessageProps,
  CreateMessageResult,
  UpdateMessageProps,
  DeleteMessageProps,
  AddReactionProps,
  PaginatedData,
} from './types'

export {
  KMessageKinds,
  KEventTypes,
  ChannelTypes,
  KCardSizes,
  KCardThemes,
  KWSStates,
  RequestMethods,
  defaultWsTimingConfig,
} from './types'
