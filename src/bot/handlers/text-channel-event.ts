import { botKookUserStore } from '../../cached-store/bot-kook-user'
import { chatCompletionStreamed as chatCompletionDeepSeek } from '../../chat/deepseek'
import { dispatchDirectives } from '../../chat/directives'
import { tryParseEvent } from '../../chat/directives/utils/events'
import { ToolFunctionContext } from '../../chat/functional/types'
import { chatCompletionStreamed as chatCompletionGoogleGemini } from '../../chat/genai'
import { chatCompletionStreamed as chatCompletionLyk } from '../../chat/lyk'
import { chatCompletionStreamed as chatCompletionChatGpt } from '../../chat/openai'
import { DisplayName } from '../../global/shared'
import { pluginLoader } from '../../plugins/loader'
import { displayNameFromUser, isTrustedUser } from '../../utils'
import { formatNumber } from '../../utils/algorithm/format'
import { configUtils } from '../../utils/config/config'
import { extractContent, isExplicitlyMentioningBot } from '../../utils/kevent/utils'
import { Dialogue } from '../../utils/krequest/dialogue'
import { Requests } from '../../utils/krequest/request'
import { error, info } from '../../utils/logging/logger'
import { KEvent, KEventType, KTextChannelExtra } from '../../websocket/kwebsocket/types'

export async function handleTextChannelEvent(event: KEvent<KTextChannelExtra>, sn: number | undefined) {
  await Promise.all(pluginLoader.plugins.map((p) => p.onTextChannelEvent?.(event, sn)))

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

async function handleTextChannelTextMessage(event: KEvent<KTextChannelExtra>) {
  const guildId = event.extra?.guild_id
  const channelId = event.target_id

  if (!guildId) {
    return
  }

  const isSentByMe = event.author_id == botKookUserStore.me.id

  const content = extractContent(event)
  const author = event.extra.author
  const displayName = displayNameFromUser(author)
  const trusted = isTrustedUser(author.id)
  const isMentioningMe = isExplicitlyMentioningBot(event, botKookUserStore.me.id)
  const whitelisted = await configUtils.main.whitelistedGuilds.isGuildWhitelisted({ guildId })
  const channelConfig = await configUtils.main.channelConfigs.getChannelConfig({ channelId })

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
    const parsedEvent = await tryParseEvent(content, event)
    if (parsedEvent.shouldIntercept) {
      if (!whitelisted && !trusted) {
        return
      }

      parsedEvent.mentionUserIds = parsedEvent.mentionUserIds.filter((id) => id !== botKookUserStore.me.id)
      const handleContextReady = () => {
        configUtils.main.contextUnits.createContextUnit({
          guildId,
          channelId,
          authorUserId: author.id,
          messageId: event.msg_id,
          authorName: isSentByMe ? DisplayName : author.nickname,
          role: isSentByMe ? 'assistant' : 'user',
          content,
        })
      }

      await dispatchDirectives(parsedEvent, handleContextReady)
      await Promise.all(pluginLoader.plugins.map((p) => p.onParsedTextChannelEvent?.(parsedEvent)))
      return
    }
  }

  await configUtils.main.contextUnits.createContextUnit({
    guildId,
    channelId,
    messageId: event.msg_id,
    role: 'user',
    authorName: displayName,
    authorUserId: author.id,
    content,
  })

  // 只有明确@我的消息才会被交给AI
  if (!isMentioningMe) {
    return
  }

  const contextUnits = await configUtils.main.contextUnits.getContextUnits({ guildId, channelId })
  const dialogue = new Dialogue(guildId, event.target_id, event.msg_id)
  await dialogue.initialize()

  const onMessage = async (message: string) => {
    if (message === '') {
      return
    }
    await dialogue.createNonAtomicTextMessage(message)
  }

  const onMessageEnd = async (_message: string, tokens: number, reasoningSummary: string | null) => {
    if (reasoningSummary) {
      console.log('xx', 'reasoningSummary', reasoningSummary)
    }
    const tokenUsage = tokens > 0 ? formatNumber(tokens) : 'N/A'
    const backendName = channelConfig.backend
    await dialogue.finalize((card) => {
      if (reasoningSummary) {
        card.addDivider().addKMarkdownText('**思考过程**').addContext(reasoningSummary).addDivider()
      }
      card.addContext(`${backendName} | ${tokenUsage}`)
      return card
    })
  }

  const onMessageError = async (message: string) => {
    error(`Failed to respond to ${displayName} reason: ${message}`)
  }

  const toolFunctionContext: ToolFunctionContext = { event, onMessage }
  const backendImpl = channelConfig.backend.startsWith('deepseek')
    ? chatCompletionDeepSeek
    : channelConfig.backend.startsWith('gemini')
      ? chatCompletionGoogleGemini
      : channelConfig.backend.startsWith('hidden')
        ? chatCompletionLyk
        : chatCompletionChatGpt

  try {
    await backendImpl(toolFunctionContext, contextUnits, channelConfig.backend, onMessage, onMessageEnd)
  } catch (e) {
    await onMessageError(e.message)
  }
}

async function handleTextChannelMultimediaMessage(event: KEvent<KTextChannelExtra>) {
  const guildId = event.extra?.guild_id

  if (!guildId) {
    return
  }

  const isSentByMe = event.author_id == botKookUserStore.me.id

  if (isSentByMe) {
    return
  }

  const whitelisted = await configUtils.main.whitelistedGuilds.isGuildWhitelisted({ guildId })

  if (!whitelisted) {
    return
  }
}
