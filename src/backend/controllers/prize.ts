import { scheduleJob } from "node-schedule"
import { KResponseWeak } from "../../utils/krequest/types"
import {
  KCardButtonValue,
  KEventType,
  KUser
} from "../../websocket/kwebsocket/types"
import { Requests } from "../../utils/krequest/request"
import { CardBuilder, CardIcons } from "../../helpers/card-helper"
import { normalizeTime } from "../utils/time"
import { shuffle } from "radash"
import { info } from "../../utils/logging/logger"
import ConfigUtils from "../../utils/config/config"

export interface CreatePrizePayload {
  prizeName: string
  prizeCount: number
  validUntil: Date
  guildId: string
  channelId: string
}

export interface Prize extends CreatePrizePayload {
  id: string
  users: KUser[]
}

const activePrizes: Prize[] = []

export function saveActivePrizes() {
  ConfigUtils.updateGlobalConfig((config) => {
    config.miscellaneous ||= {}
    config.miscellaneous.activePrizes = activePrizes.map((p) => ({
      ...p,
      validUntil: p.validUntil.getTime()
    }))
    return config
  })
  info(`Saved ${activePrizes.length} active prizes.`)
}

export function loadActivePrizes() {
  const config = ConfigUtils.getGlobalConfig()
  activePrizes.length = 0
  const savedActivePrizes = config.miscellaneous?.activePrizes || []
  for (const prize of savedActivePrizes) {
    activePrizes.push({
      ...prize,
      validUntil: new Date(prize.validUntil)
    })
    reschedulePrize(prize.id)
  }
  info(`Loaded ${activePrizes.length} active prizes.`)
}

export function reschedulePrize(prizeId: string) {
  const prize = activePrizes.find((p) => p.id === prizeId)
  if (!prize) {
    return
  }
  scheduleJob(prize.validUntil, () => {
    info(`开奖时间到，奖品ID: ${prizeId}`)

    const result = openPrize(prizeId)
    info(`开奖结果: ${JSON.stringify(result)}`)

    if (result.code === 0) {
      const winners = result.data
      if (winners === null || winners === undefined) {
        return
      }

      if (winners.length === 0) {
        Requests.createChannelMessage(
          {
            type: KEventType.Card,
            target_id: prize.channelId,
            content: CardBuilder.fromTemplate()
              .addIconWithKMarkdownText(CardIcons.MikuSad, "开奖啦！")
              .addKMarkdownText(`没有中奖者，请重新参与！`)
              .build()
          },
          { guildId: prize.guildId }
        )
      } else {
        const winnersMetMessage = winners
          .map((u) => `(met)${u.id}(met)`)
          .join(", ")

        Requests.createChannelMessage(
          {
            type: KEventType.Card,
            target_id: prize.channelId,
            content: CardBuilder.fromTemplate()
              .addIconWithKMarkdownText(CardIcons.MikuHappy, "开奖啦！")
              .addKMarkdownText(
                `恭喜 ${winnersMetMessage} 获得 ${prize.prizeName}x1！`
              )
              .build()
          },
          { guildId: prize.guildId }
        )
      }
    }
  })
}

export function createPrize(payload: CreatePrizePayload): Prize {
  const uuid = crypto.randomUUID()
  const prize: Prize = {
    id: uuid,
    users: [],
    ...payload
  }
  activePrizes.push(prize)
  reschedulePrize(prize.id)
  return prize
}

export function drawPrize(prizeId: string, user: KUser): KResponseWeak {
  const prize = activePrizes.find((p) => p.id === prizeId)
  if (!prize) {
    return { code: 1, message: "此抽奖活动已结束~" }
  }

  if (prize.users.find((u) => u.id === user.id)) {
    return { code: 2, message: "你已参与，无需再次参与，请等待抽奖结果~" }
  }
  prize.users.push(user)
  return { code: 0, message: "参与成功，祝你好运！" }
}

export function openPrize(prizeId: string) {
  const prize = activePrizes.find((p) => p.id === prizeId)
  if (!prize) {
    return { code: 1, message: "奖品不存在" }
  }

  if (prize.users.length === 0) {
    return { code: 2, message: "没有参与者" }
  }

  const winners = shuffle(prize.users).slice(0, prize.prizeCount)
  activePrizes.splice(activePrizes.indexOf(prize), 1)
  return { code: 0, data: winners }
}

export function createPrizeCard(prize: Prize) {
  const card = [
    {
      type: "card",
      theme: "secondary",
      size: "lg",
      color: "#fb7299",
      modules: [
        {
          type: "section",
          text: {
            type: "kmarkdown",
            content: `${prize.prizeName}x1`
          },
          mode: "left",
          accessory: {
            type: "image",
            src: CardIcons.MikuCute,
            size: "sm"
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "kmarkdown",
            content: `奖品总数：${prize.prizeCount}`
          }
        },
        {
          type: "section",
          text: {
            type: "kmarkdown",
            content: `开奖时间：${normalizeTime(prize.validUntil.getTime(), {
              dateZeroPadding: false,
              hourZeroPadding: false,
              dateSeparator: "/",
              timeSeparator: ":"
            })}`
          }
        },
        {
          type: "countdown",
          mode: "day",
          endTime: prize.validUntil.getTime()
        },
        {
          type: "action-group",
          elements: [
            {
              type: "button",
              theme: "primary",
              value: JSON.stringify({
                kind: "prize-draw",
                args: [prize.id]
              } as KCardButtonValue),
              click: "return-val",
              text: {
                type: "plain-text",
                content: "立即参与"
              }
            }
          ]
        }
      ]
    }
  ]
  return JSON.stringify(card)
}
