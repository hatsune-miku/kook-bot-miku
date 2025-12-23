import { botKookUserStore } from '../../cached-store/bot-kook-user'
import { chatCompletionStreamed as chatCompletionDeepSeek } from '../../chat/deepseek'
import { dispatchDirectives } from '../../chat/directives'
import { tryParseEvent } from '../../chat/directives/utils/events'
import { ToolFunctionContext } from '../../chat/functional/types'
import { chatCompletionStreamed as chatCompletionChatGpt } from '../../chat/openai'
import { DisplayName } from '../../global/shared'
import { CardBuilder, CardIcons } from '../../helpers/card-helper'
import { pluginLoader } from '../../plugins/loader'
import { displayNameFromUser, isTrustedUser } from '../../utils'
import { formatNumber } from '../../utils/algorithm/format'
import { TaskQueue } from '../../utils/algorithm/task-queue'
import { configUtils } from '../../utils/config/config'
import { extractContent, isExplicitlyMentioningBot } from '../../utils/kevent/utils'
import { Requests } from '../../utils/krequest/request'
import { error } from '../../utils/logging/logger'
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
    return
  }

  const createdMessage = sendResult.data
  const contextUnits = await configUtils.main.contextUnits.getContextUnits({ guildId, channelId })
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
    if (!result.success || result.code !== 0) {
      lastUpdateErrorMessage = result.message
      const userSideErrorMessage = `刚才的消息没能发送成功，因为【${lastUpdateErrorMessage}】~`
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
      return
    }
  }

  const onTokenReport = (tokens: number) => {
    const formattedTokens = formatNumber(tokens)
    Requests.createChannelMessage({
      type: KEventType.Card,
      target_id: event.target_id,
      content: CardBuilder.fromTemplate()
        .addIconWithKMarkdownText(CardIcons.IconCute, `Token 消耗: ${formattedTokens}`)
        .build(),
      quote: event.msg_id,
    })
  }

  const backend = channelConfig.backend.startsWith('deepseek') ? chatCompletionDeepSeek : chatCompletionChatGpt

  try {
    await backend(toolFunctionContext, contextUnits, channelConfig.backend, onMessage, onMessageEnd, onTokenReport)
  } catch {
    try {
      await backend(toolFunctionContext, contextUnits, channelConfig.backend, onMessage, onMessageEnd)
    } catch (e) {
      error('Failed to respond to', displayName, 'reason:', e.message)
      Requests.updateChannelMessage({
        msg_id: createdMessage.msg_id,
        content: CardBuilder.fromTemplate()
          .addIconWithKMarkdownText(CardIcons.IconSad, '消息发送失败了！')
          .addKMarkdownText(e.message)
          .build(),
        extra: {
          type: KEventType.Card,
          target_id: event.target_id,
        },
        quote: event.msg_id,
      })
    }
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
