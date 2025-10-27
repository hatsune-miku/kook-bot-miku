import { scheduleJob } from 'node-schedule'

import { CardIcons } from '../../helpers/card-helper'
import ConfigUtils from '../../utils/config/config'
import { Requests } from '../../utils/krequest/request'
import { EditChannelMessageProps } from '../../utils/krequest/types'
import { info } from '../../utils/logging/logger'
import { KCardButtonValue, KEventType, KUser } from '../../websocket/kwebsocket/types'

export interface VoteOption {
  title: string
  votedUsers: KUser[]
}

export interface Vote {
  id: string
  title: string
  guildId: string
  channelId: string
  options: VoteOption[]
  validUntil: Date
  msgId?: string
}

export interface CreateVotePayload {
  title: string
  options: string[]
  guildId: string
  channelId: string
  validUntil: Date
}

const activeVotes: Vote[] = []

export function saveActiveVotes() {
  ConfigUtils.updateGlobalConfig((config) => {
    config.miscellaneous ||= {}
    config.miscellaneous.activeVotes = activeVotes.map((v) => ({
      ...v,
      validUntil: v.validUntil.getTime(),
    }))
    return config
  })
  info(`Saved ${activeVotes.length} active votes.`)
}

export function loadActiveVotes() {
  const config = ConfigUtils.getGlobalConfig()
  activeVotes.length = 0
  const savedActiveVotes = config.miscellaneous?.activeVotes || []
  for (const vote of savedActiveVotes) {
    activeVotes.push({
      ...vote,
      validUntil: new Date(vote.validUntil),
    })
    rescheduleVote(vote.id)
  }
  info(`Loaded ${activeVotes.length} active votes.`)
}

export function getVote(voteId: string): Vote | undefined {
  return activeVotes.find((v) => v.id === voteId)
}

export function rescheduleVote(voteId: string) {
  const vote = getVote(voteId)
  if (!vote) {
    return
  }
  scheduleJob(vote.validUntil, () => {
    if (!vote.msgId) {
      return
    }

    const index = activeVotes.indexOf(vote)
    if (index === -1) {
      return
    }
    activeVotes.splice(index, 1)
    Requests.updateChannelMessage(
      {
        msg_id: vote.msgId,
        content: createVoteCard(null, vote, false, true),
        extra: {
          type: KEventType.Card,
          target_id: vote.channelId,
        },
      },
      { guildId: vote.guildId }
    )
  })
}

export function createVote(payload: CreateVotePayload): Vote {
  const id = crypto.randomUUID()
  const vote: Vote = {
    id,
    title: payload.title,
    options: payload.options.map((opt) => ({ title: opt, votedUsers: [] })),
    guildId: payload.guildId,
    channelId: payload.channelId,
    validUntil: payload.validUntil,
  }
  activeVotes.push(vote)
  Requests.createChannelMessage(
    {
      type: KEventType.Card,
      target_id: vote.channelId,
      content: createVoteCard(null, vote, false, false),
    },
    { guildId: payload.guildId }
  ).then((response) => {
    if (response.code !== 0 || !response.data?.msg_id) {
      return
    }
    registerVoteMsgId(vote.id, response.data.msg_id)
    rescheduleVote(vote.id)
  })
  return vote
}

async function synchronizeVoteCard(currentUser: KUser | null, vote: Vote) {
  if (!vote.msgId) {
    return
  }
  const updateChannelMessagePayload: EditChannelMessageProps = {
    msg_id: vote.msgId,
    content: createVoteCard(currentUser, vote, false, false),
    extra: {
      type: KEventType.Card,
      target_id: vote.channelId,
    },
  }
  await Requests.updateChannelMessage(updateChannelMessagePayload, {
    guildId: vote.guildId,
  })

  if (currentUser) {
    updateChannelMessagePayload.content = createVoteCard(currentUser, vote, true, false)
    updateChannelMessagePayload.temp_target_id = currentUser.id
    await Requests.updateChannelMessage(updateChannelMessagePayload, {
      guildId: vote.guildId,
    })
  }
}

export async function submitVote(voteId: string, user: KUser, option: string) {
  const vote = getVote(voteId)
  if (!vote) {
    return { code: 1, message: '投票不存在' }
  }
  const votedUsers = vote.options.find((o) => o.title === option)?.votedUsers
  if (!votedUsers) {
    return { code: 1, message: '选项不存在' }
  }
  if (votedUsers.find((u) => u.id === user.id)) {
    votedUsers.splice(votedUsers.indexOf(user), 1)
    await synchronizeVoteCard(user, vote)
    return {
      code: 0,
      message: `取消投票成功，你已撤销了你对“${option}”的投票。`,
    }
  }
  votedUsers.push(user)
  await synchronizeVoteCard(user, vote)
  return { code: 0, message: `投票成功，你投了“${option}”一票。` }
}

export function registerVoteMsgId(voteId: string, msgId: string) {
  const vote = getVote(voteId)
  if (!vote) {
    return
  }
  vote.msgId = msgId
}

function createVoteOptionModules(
  currentUser: KUser | null,
  voteOption: VoteOption,
  vote: Vote,
  privateMessage: boolean,
  ended: boolean
) {
  const votedByCurrentUser = voteOption.votedUsers.find((u) => u.id === currentUser?.id)

  return [
    {
      type: 'section',
      text: {
        type: 'plain-text',
        content: `（${voteOption.votedUsers.length}票）${voteOption.title}`,
      },
      mode: 'right',
      accessory: ended
        ? undefined
        : {
            type: 'button',
            theme: 'primary',
            value: JSON.stringify({
              kind: 'vote-submit',
              args: [vote.id, voteOption.title],
            } as KCardButtonValue),
            click: 'return-val',
            text: {
              type: 'plain-text',
              content: privateMessage ? (votedByCurrentUser ? '取消投票' : '投票') : '投票',
            },
          },
    },
    {
      type: 'context',
      elements: [
        ...(privateMessage && votedByCurrentUser
          ? [
              {
                type: 'plain-text',
                content: `你投了“${voteOption.title}”一票。`,
              },
            ]
          : []),
        ...voteOption.votedUsers.map((u) => ({
          type: 'image',
          src: u.vip_avatar || u.avatar,
        })),
      ],
    },
  ]
}

function createVoteOptionsModules(currentUser: KUser | null, vote: Vote, privateMessage: boolean, ended: boolean) {
  const modules = []
  for (const option of vote.options) {
    modules.push(...createVoteOptionModules(currentUser, option, vote, privateMessage, ended))
    modules.push({ type: 'divider' })
  }
  if (modules.length > 1) {
    modules.pop()
  }
  return modules
}

export function createVoteCard(currentUser: KUser | null, vote: Vote, privateMessage: boolean, ended: boolean) {
  const card = [
    {
      type: 'card',
      theme: 'secondary',
      size: 'lg',
      color: '#fb7299',
      modules: [
        {
          type: 'section',
          text: {
            type: 'kmarkdown',
            content: `**${vote.title}**`,
          },
          mode: 'left',
          accessory: {
            type: 'image',
            src: CardIcons.MikuHappy,
            size: 'sm',
          },
        },
        ...createVoteOptionsModules(currentUser, vote, privateMessage, ended),
        {
          type: 'divider',
        },
        ...(ended
          ? [
              {
                type: 'context',
                elements: [
                  {
                    type: 'plain-text',
                    content: `投票已于 ${vote.validUntil} 截止~`,
                  },
                ],
              },
            ]
          : [
              {
                type: 'context',
                elements: [
                  {
                    type: 'plain-text',
                    content: '距离投票截止还有',
                  },
                ],
              },
              {
                type: 'countdown',
                mode: 'day',
                endTime: vote.validUntil.getTime(),
              },
            ]),
      ],
    },
  ]
  return JSON.stringify(card)
}
