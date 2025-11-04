import { chatCompletionStreamed as chatCompletionDeepSeek } from './chat/deepseek'
import { dispatchDirectives } from './chat/directives'
import { tryParseEvent } from './chat/directives/utils/events'
import { ToolFunctionContext } from './chat/functional/types'
import { chatCompletionStreamed as chatCompletionChatGpt } from './chat/openai'
import { Events, RespondToUserParameters, botEventEmitter } from './events'
import { DisplayName, shared } from './global/shared'
import { CardBuilder, CardIcons } from './helpers/card-helper'
import { displayNameFromUser, isTrustedUser } from './utils'
import { TaskQueue } from './utils/algorithm/task-queue'
import { ConfigUtils, initializeConfig } from './utils/config/config'
import { extractContent, isExplicitlyMentioningBot } from './utils/kevent/utils'
import { Requests } from './utils/krequest/request'
import { CreateChannelMessageResult, KResponseExt } from './utils/krequest/types'
import { error, info, warn } from './utils/logging/logger'
import { die } from './utils/server/die'
import { KWSHelper } from './websocket/kwebsocket/kws-helper'
import {
  KCardButtonExtra,
  KCardButtonValue,
  KEvent,
  KEventType,
  KSystemEventExtra,
  KTextChannelExtra,
} from './websocket/kwebsocket/types'

export async function main() {
  ConfigUtils.main = await initializeConfig()
  await tryPrepareBotInformation()

  const helper = new KWSHelper({
    onSevereError: handleSevereError,
    onTextChannelEvent: handleTextChannelEvent,
    onSystemEvent: handleSystemEvent,
    onReset: handleReset,
    autoReconnect: true,
  })
  helper.startWebsocket()

  botEventEmitter.on(Events.RespondToUser, handleRespondToUserEvent)
  botEventEmitter.on(Events.RespondCardMessageToUser, handleRespondCardMessageToUserEvent)

  info('Initialization OK')
}

export function deinitialize() {
  info('Deinitialization OK')
}

async function handleRespondToUserEvent(
  event: RespondToUserParameters,
  callback?: (result: KResponseExt<CreateChannelMessageResult>) => void
) {
  const result = await Requests.createChannelMessage(
    {
      type: KEventType.KMarkdown,
      target_id: event.originalEvent.target_id,
      content: event.content,
      quote: event.originalEvent.msg_id,
    },
    event.withContext
  )

  callback?.(result)
  if (!result.success) {
    error('Failed to respond to', displayNameFromUser(event.originalEvent.extra.author), 'reason:', result.message)
  }
}

async function handleRespondCardMessageToUserEvent(
  event: RespondToUserParameters,
  callback?: (result: KResponseExt<CreateChannelMessageResult>) => void
) {
  const result = await Requests.createChannelMessage(
    {
      type: KEventType.Card,
      target_id: event.originalEvent.target_id,
      content: event.content,
      quote: event.originalEvent.msg_id,
    },
    event.withContext
  )

  callback?.(result)
  if (!result.success) {
    error('Failed to respond to', displayNameFromUser(event.originalEvent.extra.author), 'reason:', result.message)
  }
}

async function tryPrepareBotInformation() {
  info('Querying self information from KOOK...')
  const querySelfResult = await Requests.querySelfUser()
  const self = querySelfResult.data

  if (!querySelfResult.success) {
    // 写php写的
    die(`Query-self failed: ${querySelfResult.message}`)
  }

  if (!self.bot) {
    warn(`KOOK说我不是bot，震惊!`)
  }

  const displayName = `${self.username}#${self.identify_num}`
  info('I am', displayName, 'with user id', self.id)

  shared.me = self
}

function handleSevereError(message: string) {
  die(`A severe error occured and bot must exit: ${message}`)
}

async function handleTextChannelTextMessage(event: KEvent<KTextChannelExtra>) {
  const guildId = event.extra?.guild_id
  const channelId = event.target_id

  if (!guildId) {
    return
  }

  const isSentByMe = event.author_id == shared.me.id

  const content = extractContent(event)
  const author = event.extra.author
  const displayName = displayNameFromUser(author)
  const trusted = isTrustedUser(author.id)
  const isMentioningMe = isExplicitlyMentioningBot(event, shared.me.id)
  const whitelisted = await ConfigUtils.main.whitelistedGuilds.isGuildWhitelisted({ guildId })
  const channelConfig = await ConfigUtils.main.channelConfigs.getChannelConfig({ channelId })

  if (isSentByMe) {
    return
  }

  if (isMentioningMe && !whitelisted && !trusted) {
    await Requests.createChannelMessage({
      type: KEventType.KMarkdown,
      target_id: event.target_id,
      content: `${DisplayName}机器人还在内测中，当前服务器 (${guildId}) 未在白名单。有意请联系 (met)3553226959(met)~`,
      quote: event.msg_id,
    })
    return
  }

  // @我或者可以免除@我，都可以处理指令
  if (isMentioningMe || channelConfig.allowOmittingMentioningMe) {
    // Process directives
    info('Processing directives for', displayName, 'with content', content)
    const parsedEvent = await tryParseEvent(content, event)
    if (parsedEvent.shouldIntercept) {
      if (!whitelisted) {
        return
      }

      parsedEvent.mentionUserIds = parsedEvent.mentionUserIds.filter((id) => id !== shared.me.id)
      const handleContextReady = () => {
        ConfigUtils.main.contextUnits.createContextUnit({
          guildId,
          channelId,
          authorUserId: author.id,
          messageId: event.msg_id,
          authorName: isSentByMe ? DisplayName : author.nickname,
          role: isSentByMe ? 'assistant' : 'user',
          content,
        })
      }

      dispatchDirectives(parsedEvent, handleContextReady)
      return
    }
  }

  // 只有明确@我的消息才会被交给AI
  if (!isMentioningMe) {
    return
  }

  const initialResponse = `${DisplayName}打字中...`
  const sendResult = await Requests.createChannelMessage(
    {
      type: KEventType.Card,
      target_id: event.target_id,
      content: CardBuilder.fromTemplate().addIconWithKMarkdownText(CardIcons.IconHappy, initialResponse).build(),
      quote: event.msg_id,
    },
    { guildId, originalTextContent: initialResponse }
  )

  if (!sendResult.success) {
    error('Failed to respond to', displayName, 'reason:', sendResult.message)
    return
  } else {
    info('Successfully responded to', displayName, sendResult, sendResult.data)
  }

  const createdMessage = sendResult.data
  const contextUnits = await ConfigUtils.main.contextUnits.getContextUnits({ guildId, channelId })
  const toolFunctionContext: ToolFunctionContext = { event }

  let modelMessageAccumulated = ''
  const queue = new TaskQueue()
  const onMessage = async (message: string) => {
    if (message === '') {
      return
    }
    modelMessageAccumulated += message
    queue.submit(async () => {
      try {
        info('update message part', modelMessageAccumulated.length)
        await Requests.updateChannelMessage(
          {
            msg_id: createdMessage.msg_id,
            content: CardBuilder.fromTemplate()
              .addIconWithKMarkdownText(CardIcons.IconCute, '')
              .addKMarkdownText(modelMessageAccumulated)
              .build(),
            quote: event.msg_id,
            extra: {
              type: KEventType.KMarkdown,
              target_id: event.target_id,
            },
          },
          { guildId, originalTextContent: modelMessageAccumulated }
        )
      } catch {
        // ignored
      }
    })
  }

  const onMessageEnd = async (message: string) => {
    queue.stop()
    let lastUpdateErrorMessage = ''

    modelMessageAccumulated = message
    info('update final message', modelMessageAccumulated)
    const result = await Requests.updateChannelMessage(
      {
        msg_id: createdMessage.msg_id,
        content: CardBuilder.fromTemplate()
          .addIconWithKMarkdownText(CardIcons.IconCute, '')
          .addKMarkdownText(modelMessageAccumulated)
          .build(),
        quote: event.msg_id,
        extra: {
          type: KEventType.KMarkdown,
          target_id: event.target_id,
        },
      },
      { guildId, originalTextContent: modelMessageAccumulated }
    )
    const isUpdateMessageSuccess = result.success && result.code === 0
    if (!isUpdateMessageSuccess) {
      lastUpdateErrorMessage = result.message
    }

    info('full model response', modelMessageAccumulated)
    const userSideErrorMessage = `刚才的消息没能发送成功，因为【${lastUpdateErrorMessage}】~`

    if (!isUpdateMessageSuccess) {
      Requests.updateChannelMessage(
        {
          msg_id: createdMessage.msg_id,
          content: CardBuilder.fromTemplate()
            .addIconWithKMarkdownText(CardIcons.IconSad, '消息发送失败了！')
            .addKMarkdownText(userSideErrorMessage)
            .build(),
          quote: event.msg_id,
          extra: {
            type: KEventType.KMarkdown,
            target_id: event.target_id,
          },
        },
        { guildId, originalTextContent: userSideErrorMessage }
      )
      error('Failed to update message', createdMessage.msg_id, 'reason:', lastUpdateErrorMessage)
    }
  }

  const backend = channelConfig.backend.startsWith('deepseek') ? chatCompletionDeepSeek : chatCompletionChatGpt

  try {
    await backend(toolFunctionContext, contextUnits, channelConfig.backend, onMessage, onMessageEnd)
  } catch {
    try {
      await backend(toolFunctionContext, contextUnits, channelConfig.backend, onMessage, onMessageEnd)
    } catch {
      error('Failed to respond to', displayName, 'reason:', 'unknown')
    }
  }
}

async function handleTextChannelMultimediaMessage(event: KEvent<KTextChannelExtra>) {
  const guildId = event.extra?.guild_id

  if (!guildId) {
    return
  }

  const isSentByMe = event.author_id == shared.me.id

  if (isSentByMe) {
    return
  }

  const whitelisted = await ConfigUtils.main.whitelistedGuilds.isGuildWhitelisted({ guildId })

  if (!whitelisted) {
    return
  }
}

async function dispatchCardButtonEvent(event: KEvent<KCardButtonExtra>) {
  let value: KCardButtonValue

  if (!event.extra?.body?.user_info) {
    info('No user info in event')
    return
  }

  const eventBody = event.extra.body

  try {
    value = JSON.parse(eventBody.value || '{}')
  } catch (e) {
    info('Failed to parse card button value', e)
    return
  }
}

async function handleTextChannelEvent(event: KEvent<KTextChannelExtra>) {
  switch (event.type) {
    case KEventType.KMarkdown:
    case KEventType.Card:
    case KEventType.Text: {
      return await handleTextChannelTextMessage(event)
    }

    case KEventType.Image:
    case KEventType.File:
    case KEventType.Video:
    case KEventType.Audio: {
      return await handleTextChannelMultimediaMessage(event)
    }

    default: {
      break
    }
  }
}

function handleSystemEvent(event: KEvent<KSystemEventExtra>) {
  const extra = event.extra
  const guildId = event.target_id

  if (!guildId) {
    return
  }

  switch (extra.type) {
    case 'deleted_message': {
      if (extra.body.channel_id && extra.body.msg_id) {
        info('Deleted message', extra.body.msg_id)
        ConfigUtils.main.contextUnits.deleteContextUnit({
          guildId,
          channelId: extra.body.channel_id,
          messageId: extra.body.msg_id,
        })
      }
      break
    }

    case 'message_btn_click': {
      info('Button clicked', extra.body)
      dispatchCardButtonEvent(event as KEvent<KCardButtonExtra>)
    }
  }
}

function handleReset() {
  botEventEmitter.emit('send-lark-message', {
    title: `${DisplayName} Event`,
    message: 'Server: Reset',
  })
}
