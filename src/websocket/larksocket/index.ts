import { draw } from 'radash'

import { GoogleGenAI } from '@google/genai'
import * as lark from '@larksuiteoapi/node-sdk'

import { botEventEmitter } from '../../events'
import { configUtils } from '../../utils/config/config'
import { Env } from '../../utils/env/env'
import { Requests } from '../../utils/krequest/request'
import { info } from '../../utils/logging/logger'
import { KEventType } from '../kwebsocket/types'

let lastChatSessionId: string | null = null

async function generateWeeklyReport(logs: { content: string; createdAt: number }[]): Promise<string> {
  if (logs.length === 0) {
    return '过去 7 天内没有记录任何工作内容。'
  }

  let baseUrl = Env.GoogleGeminiBaseUrl || undefined
  if (baseUrl) {
    baseUrl = baseUrl.replace(/\/v1$/, '').replace(/\/v1beta$/, '')
  }

  const ai = new GoogleGenAI({
    apiKey: draw(Env.GoogleGeminiKeys)!,
    httpOptions: { baseUrl },
  })

  const logsText = logs
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((log) => `[${new Date(log.createdAt).toLocaleString('zh-CN')}] ${log.content}`)
    .join('\n')

  const systemPrompt = `你是一个周报生成助手。根据用户提供的碎片化工作记录，整理成一份结构清晰的周报。

周报格式要求：
# 本周工作内容
- （按工作类型或项目分类整理）

# 下周计划
- （根据本周工作内容，合理推断下周可能的工作计划）

注意：
- 合并相似的工作内容
- 使用简洁的语言
- 下周计划要基于本周工作的延续性推断`

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'user', parts: [{ text: `以下是我过去一周的工作记录：\n\n${logsText}` }] },
    ],
  })

  return response.text || '生成周报失败'
}

export async function initializeLarkBot() {
  if (!Env.LarkAppId || !Env.LarkAppSecret) {
    info('Lark bot not enabled')
    return
  }

  const baseConfig = {
    appId: Env.LarkAppId,
    appSecret: Env.LarkAppSecret,
  }

  const client = new lark.Client(baseConfig)
  const wsClient = new lark.WSClient({
    ...baseConfig,
    loggerLevel: lark.LoggerLevel.fatal,
  })

  async function sendMessage(title: string, message: string) {
    if (!lastChatSessionId) {
      return
    }
    await client.im.v1.message.create({
      params: {
        receive_id_type: 'chat_id',
      },
      data: {
        receive_id: lastChatSessionId,
        content: lark.messageCard.defaultCard({
          title: title,
          content: message,
        }),
        msg_type: 'interactive',
      },
    })
  }

  botEventEmitter.on('send-lark-message', ({ title, message }: { title: string; message: string }) => {
    sendMessage(title, message)
  })

  wsClient.start({
    eventDispatcher: new lark.EventDispatcher({}).register({
      'im.message.receive_v1': async (data) => {
        const {
          message: { chat_id, content },
          sender: { sender_id },
        } = data

        let parsed: any
        try {
          parsed = JSON.parse(content)
        } catch {
          return
        }

        const { text } = parsed
        if (!text) {
          return
        }

        const userId = sender_id?.user_id || sender_id?.open_id || 'unknown'
        lastChatSessionId = chat_id

        // 处理指令
        if (text.startsWith('/')) {
          const components = text.slice(1).split(' ') as string[]
          const directive = components[0]

          if (directive === '周报') {
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
            const logs = await configUtils.main.workLogs.getWorkLogs({ userId, since: sevenDaysAgo })
            const report = await generateWeeklyReport(logs)
            await sendMessage('周报', report)
            return
          }
        }

        // 处理非指令消息 - 存储工作日志
        if (!text.startsWith('/')) {
          await configUtils.main.workLogs.addWorkLog({ userId, content: text })
        }

        // 原有的打包指令保留
        const components = text.split(' ') as string[]
        const directive = components[0]
        const parameters = components.slice(1).filter((x) => x.length > 0)

        if (directive === '打包') {
          const [branch] = parameters
          Requests.createChannelMessage(
            {
              type: KEventType.KMarkdown,
              target_id: '9881678244960302',
              content: `(met)1211389071(met) /打包 ${branch}`,
            },
            {
              guildId: '9497223449100660',
            }
          )
          await sendMessage(
            '已通知打包嘟嘟',
            `大概 5 分钟后目标分支 (${branch}) 即可打包完成。网址：https://gz-www.dev.chuanyuapp.com/`
          )
        }
      },
    }),
  })
}
