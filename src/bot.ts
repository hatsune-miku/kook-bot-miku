/*
 * @Path          : \kook-bot-cgrelay\src\bot.ts
 * @Created At    : 2024-05-21 17:13:02
 * @Last Modified : 2024-05-30 14:13:23
 * @By            : Guan Zhen (guanzhen@chuanyuapp.com)
 * @Description   : Magic. Don't touch.
 */

import { ContextManager } from "./chat/context-manager"
import { chatCompletionStreamed as chatCompletionChatGpt } from "./chat/openai"
import { chatCompletionStreamed as chatCompletionDeepSeek } from "./chat/deepseek"
import { chatCompletionStreamed as chatCompletionErnie } from "./chat/ernie"
import { ChatDirectivesManager } from "./chat/directives"
import { shared } from "./global/shared"
import { extractContent, isExplicitlyMentioningBot } from "./utils/kevent/utils"
import { Requests } from "./utils/krequest/request"
import { error, info, warn } from "./utils/logging/logger"
import { die } from "./utils/server/die"
import { GuildRoleManager } from "./websocket/kwebsocket/guild-role-manager"
import { KWSHelper } from "./websocket/kwebsocket/kws-helper"
import {
  KCardButtonExtra,
  KCardButtonValue,
  KEvent,
  KEventType,
  KSystemEventExtra,
  KTextChannelExtra
} from "./websocket/kwebsocket/types"
import { botEventEmitter, Events, RespondToUserParameters } from "./events"
import { displayNameFromUser, isTrustedUser } from "./utils"
import ConfigUtils from "./utils/config/config"
import { ChatBotBackend, ContextUnit, GroupChatStrategy } from "./chat/types"
import { CardBuilder, CardIcons } from "./helpers/card-helper"
import { ToolFunctionContext } from "./chat/functional/context"
import {
  CreateChannelMessageResult,
  KResponseExt
} from "./utils/krequest/types"
import { TaskQueue } from "./utils/algorithm/task-queue"
import {
  drawPrize,
  loadActivePrizes,
  saveActivePrizes
} from "./backend/controllers/prize"
import {
  loadActiveVotes,
  saveActiveVotes,
  submitVote
} from "./backend/controllers/vote"
import { viewCodeBlock } from "./backend/controllers/code"

ConfigUtils.initialize()

const contextManager = new ContextManager()
const roleManager = new GuildRoleManager()
const directivesManager = new ChatDirectivesManager(botEventEmitter)

directivesManager.setContextManager(contextManager)
Requests.registerContextManager(contextManager)

export async function main() {
  await tryPrepareBotInformation()

  const helper = new KWSHelper({
    onSevereError: handleSevereError,
    onTextChannelEvent: handleTextChannelEvent,
    onSystemEvent: handleSystemEvent,
    onReset: handleReset,
    autoReconnect: true
  })
  helper.startWebsocket()

  botEventEmitter.on(Events.RespondToUser, handleRespondToUserEvent)
  botEventEmitter.on(
    Events.RespondCardMessageToUser,
    handleRespondCardMessageToUserEvent
  )

  loadActiveVotes()
  loadActivePrizes()
  info("Initialization OK")
}

export function deinitialize() {
  saveActiveVotes()
  saveActivePrizes()
  ConfigUtils.persist()
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
      quote: event.originalEvent.msg_id
    },
    event.withContext
  )

  callback?.(result)
  if (!result.success) {
    error(
      "Failed to respond to",
      displayNameFromUser(event.originalEvent.extra.author),
      "reason:",
      result.message
    )
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
      quote: event.originalEvent.msg_id
    },
    event.withContext
  )

  callback?.(result)
  if (!result.success) {
    error(
      "Failed to respond to",
      displayNameFromUser(event.originalEvent.extra.author),
      "reason:",
      result.message
    )
  }
}

async function tryPrepareBotInformation() {
  info("Querying self information from KOOK...")
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
  info("I am", displayName, "with user id", self.id)

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

  const myRoles = await roleManager.getMyRolesAt(guildId, shared.me.id)
  const isSentByMe = event.author_id == shared.me.id

  const content = extractContent(event)
  const author = event.extra.author
  const displayName = displayNameFromUser(author)
  const isMentioningMe = isExplicitlyMentioningBot(event, shared.me.id, myRoles)
  const groupChatStrategy = directivesManager.getGroupChatStrategy(
    guildId,
    channelId
  )
  const calledByTrustedUser = isTrustedUser(event.extra.author.id)
  const whitelisted =
    (ConfigUtils.getGlobalConfig().whiteListedGuildIds ?? {}).hasOwnProperty(
      guildId
    ) || calledByTrustedUser

  if (isSentByMe) {
    return
  }

  if (isMentioningMe && !whitelisted) {
    await Requests.createChannelMessage({
      type: KEventType.KMarkdown,
      target_id: event.target_id,
      content: `miku机器人还在内测中，当前服务器 (${guildId}) 未在白名单。有意请联系 (met)3553226959(met)~`,
      quote: event.msg_id
    })
    return
  }

  // @我或者可以免除@我，都可以处理指令
  if (
    isMentioningMe ||
    directivesManager.isAllowOmittingMentioningMeEnabled(guildId, channelId)
  ) {
    // Process directives
    info("Processing directives for", displayName, "with content", content)
    directivesManager.tryInitializeForUser(guildId, author)
    const parsedEvent = await directivesManager.tryParseEvent(content, event)
    if (parsedEvent.shouldIntercept) {
      if (!whitelisted) {
        return
      }

      parsedEvent.mentionUserIds = parsedEvent.mentionUserIds.filter(
        (id) => id !== shared.me.id
      )
      parsedEvent.mentionRoleIds = parsedEvent.mentionRoleIds.filter(
        (rid) => !myRoles.includes(rid)
      )

      directivesManager.dispatchDirectives(parsedEvent, () => {
        contextManager.appendToContext(
          guildId,
          channelId,
          author.id,
          event.msg_id,
          isSentByMe ? "Miku" : author.nickname,
          isSentByMe ? "assistant" : "user",
          content,
          !isMentioningMe
        )
      })
      return
    }
  }

  const shouldIncludeFreeChat = groupChatStrategy === GroupChatStrategy.Normal
  contextManager.appendToContext(
    guildId,
    channelId,
    author.id,
    event.msg_id,
    isSentByMe ? "Miku" : author.nickname,
    isSentByMe ? "assistant" : "user",
    content,
    !isMentioningMe
  )

  // 只有明确@我的消息才会被交给ChatGPT
  if (!isMentioningMe) {
    return
  }

  const initialResponse = "Miku打字中..."
  const sendResult = await Requests.createChannelMessage(
    {
      type: KEventType.Card,
      target_id: event.target_id,
      content: CardBuilder.fromTemplate()
        .addIconWithKMarkdownText(
          "https://img.kookapp.cn/assets/2024-11/08/j9AUs4J16i04s04y.png",
          initialResponse
        )
        .build(),
      quote: event.msg_id
    },
    { guildId, originalTextContent: initialResponse }
  )

  if (!sendResult.success) {
    error("Failed to respond to", displayName, "reason:", sendResult.message)
    return
  } else {
    info("Successfully responded to", displayName, sendResult, sendResult.data)
  }

  const isGroupChat = groupChatStrategy !== GroupChatStrategy.Off
  const createdMessage = sendResult.data
  const context = isGroupChat
    ? contextManager.getMixedContext(guildId, channelId, shouldIncludeFreeChat)
    : contextManager.getContext(guildId, channelId, author.id)

  const backendModelName = directivesManager.getChatBotBackend(
    guildId,
    channelId
  )
  const backendConfig = directivesManager.getChatBotBackend(guildId, channelId)
  const toolFunctionContext = new ToolFunctionContext(
    event,
    directivesManager,
    contextManager
  )

  let modelMessageAccumulated = ""
  const queue = new TaskQueue()
  const onMessage = async (message: string) => {
    if (message === "") {
      return
    }
    modelMessageAccumulated += message
    queue.submit(async () => {
      try {
        info("update message part", modelMessageAccumulated.length)
        await Requests.updateChannelMessage(
          {
            msg_id: createdMessage.msg_id,
            content: CardBuilder.fromTemplate()
              .addIconWithKMarkdownText(
                "https://img.kookapp.cn/assets/2024-11/08/j9AUs4J16i04s04y.png",
                ""
              )
              .addKMarkdownText(modelMessageAccumulated)
              .build(),
            quote: event.msg_id,
            extra: {
              type: KEventType.KMarkdown,
              target_id: event.target_id
            }
          },
          { guildId, originalTextContent: modelMessageAccumulated }
        )
      } catch {}
    })
  }

  const onMessageEnd = async (message: string) => {
    queue.stop()
    let lastUpdateErrorMessage = ""

    modelMessageAccumulated = message
    info("update final message", modelMessageAccumulated)
    const result = await Requests.updateChannelMessage(
      {
        msg_id: createdMessage.msg_id,
        content: CardBuilder.fromTemplate()
          .addIconWithKMarkdownText(
            "https://img.kookapp.cn/assets/2024-11/08/j9AUs4J16i04s04y.png",
            ""
          )
          .addKMarkdownText(modelMessageAccumulated)
          .build(),
        quote: event.msg_id,
        extra: {
          type: KEventType.KMarkdown,
          target_id: event.target_id
        }
      },
      { guildId, originalTextContent: modelMessageAccumulated }
    )
    const isUpdateMessageSuccess = result.success && result.code === 0
    if (!isUpdateMessageSuccess) {
      lastUpdateErrorMessage = result.message
    }

    info("full model response", modelMessageAccumulated)
    const userSideErrorMessage = `刚才的消息没能发送成功，因为【${lastUpdateErrorMessage}】~`

    if (!isUpdateMessageSuccess) {
      Requests.updateChannelMessage(
        {
          msg_id: createdMessage.msg_id,
          content: CardBuilder.fromTemplate()
            .addIconWithKMarkdownText(
              "https://img.kookapp.cn/assets/2024-11/08/j9AUs4J16i04s04y.png",
              "消息发送失败了！"
            )
            .addKMarkdownText(userSideErrorMessage)
            .build(),
          quote: event.msg_id,
          extra: {
            type: KEventType.KMarkdown,
            target_id: event.target_id
          }
        },
        { guildId, originalTextContent: userSideErrorMessage }
      )
      error(
        "Failed to update message",
        createdMessage.msg_id,
        "reason:",
        lastUpdateErrorMessage
      )
    }
  }

  const backend =
    backendConfig === ChatBotBackend.Ernie
      ? chatCompletionErnie
      : backendConfig.startsWith("deepseek")
      ? (
          groupChat: boolean,
          context: ContextUnit[],
          onMessage: (message: string) => void,
          onMessageEnd: (message: string) => void
        ) =>
          chatCompletionDeepSeek(
            toolFunctionContext,
            groupChat,
            context,
            backendModelName,
            onMessage,
            onMessageEnd
          )
      : (
          groupChat: boolean,
          context: ContextUnit[],
          onMessage: (message: string) => void,
          onMessageEnd: (message: string) => void
        ) =>
          chatCompletionChatGpt(
            toolFunctionContext,
            groupChat,
            context,
            backendModelName,
            onMessage,
            onMessageEnd
          )

  try {
    await backend(isGroupChat, context, onMessage, onMessageEnd)
  } catch {
    try {
      await backend(isGroupChat, context, onMessage, onMessageEnd)
    } catch {
      error("Failed to respond to", displayName, "reason:", "unknown")
    }
  }
}

async function handleTextChannelMultimediaMessage(
  event: KEvent<KTextChannelExtra>
) {
  const dataUrl = event.content
  const guildId = event.extra?.guild_id
  const channelId = event.target_id

  if (!guildId) {
    return
  }

  const myRoles = await roleManager.getMyRolesAt(guildId, shared.me.id)
  const isSentByMe = event.author_id == shared.me.id

  if (isSentByMe) {
    return
  }

  const author = event.extra.author
  const displayName = displayNameFromUser(author)
  const calledByTrustedUser = isTrustedUser(event.extra.author.id)
  const whitelisted =
    (ConfigUtils.getGlobalConfig().whiteListedGuildIds ?? {}).hasOwnProperty(
      guildId
    ) || calledByTrustedUser

  if (!whitelisted) {
    return
  }

  info("extra", event.extra)
}

async function dispatchCardButtonEvent(event: KEvent<KCardButtonExtra>) {
  let value: KCardButtonValue

  if (!event.extra?.body?.user_info) {
    info("No user info in event")
    return
  }

  const eventBody = event.extra.body

  try {
    value = JSON.parse(eventBody.value || "{}")
  } catch (e) {
    info("Failed to parse card button value", e)
    return
  }

  switch (value.kind) {
    case "prize-draw": {
      const prizeId = value.args[0]
      const result = drawPrize(prizeId, eventBody.user_info)
      const cardBuilder = CardBuilder.fromTemplate()
        .addIconWithKMarkdownText(CardIcons.MikuCute, "抽奖通知！")
        .addKMarkdownText(result.message || "祝你好运！")
      Requests.createChannelPrivateMessage({
        channelId: eventBody.target_id,
        targetUserId: eventBody.user_info.id,
        cardBuilder
      })
      break
    }

    case "vote-submit": {
      const voteId = value.args[0]
      const optionTitle = value.args[1]
      submitVote(voteId, eventBody.user_info, optionTitle).then(
        ({ message }) => {
          const cardBuilder = CardBuilder.fromTemplate()
            .addIconWithKMarkdownText(CardIcons.MikuCute, "投票通知！")
            .addKMarkdownText(message)
          Requests.createChannelPrivateMessage({
            channelId: eventBody.target_id,
            targetUserId: eventBody.user_info.id,
            cardBuilder
          })
        }
      )
      break
    }

    case "code-view": {
      const codeBlockId = value.args[0]
      viewCodeBlock(eventBody.user_info, eventBody.target_id, codeBlockId)
      break
    }
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
    case "deleted_message": {
      if (extra.body.channel_id && extra.body.msg_id) {
        info("Deleted message", extra.body.msg_id)
        contextManager.deleteMessageFromContext(
          guildId,
          extra.body.channel_id,
          extra.body.msg_id
        )
      }
      break
    }

    case "message_btn_click": {
      info("Button clicked", extra.body)
      dispatchCardButtonEvent(event as KEvent<KCardButtonExtra>)
    }
  }
}

function handleReset() {
  botEventEmitter.emit("send-lark-message", {
    title: "Miku Event",
    message: "Server: Reset"
  })
}
