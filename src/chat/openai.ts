import { HttpProxyAgent } from 'http-proxy-agent'
import OpenAI from 'openai'
import { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/resources'
import { Completions } from 'openai/resources/chat'
import { draw } from 'radash'

import { ToolFunctionInvoker } from './functional/tool-function'
import { getChatCompletionTools } from './functional/tool-functions/dispatch'
import { ToolFunctionContext } from './functional/types'

import { KCardMessageElement, KCardMessageSubElement } from '../events'
import { DisplayName } from '../global/shared'
import { ContextUnit } from '../utils/config/types'
import { Env } from '../utils/env/env'

function mapContextUnit(unit: ContextUnit): ChatCompletionMessageParam {
  const normalUnit: ChatCompletionMessageParam = {
    role: 'user',
    content: `${unit.authorName}(id=${unit.authorUserId})说: ${unit.content}`,
  }

  let parsed: any
  try {
    parsed = JSON.parse(unit.content)
  } catch {
    // 不是JSON
    return normalUnit
  }

  if (Array.isArray(parsed)) {
    parsed = parsed[0]
  }

  if (!parsed) {
    return normalUnit
  }

  const message = parsed as KCardMessageElement
  const isCardMessage = message.type === 'card' && message.theme?.length > 1
  if (!isCardMessage) {
    return normalUnit
  }

  const modules = message.modules
  if (!Array.isArray(modules)) {
    return normalUnit
  }

  const processModules = (modules: KCardMessageSubElement[], onImageFound: (src: string) => void) => {
    for (const m of modules) {
      if (m.type === 'container') {
        processModules(m.elements || [], onImageFound)
      } else if (m.type.includes('image')) {
        onImageFound(m.src)
      }
    }
  }

  const result: ChatCompletionMessageParam = {
    role: 'user',
    content: [],
  }

  try {
    processModules(modules, (src) => {
      ;(result.content as Array<ChatCompletionContentPart>).push({
        type: 'image_url',
        image_url: {
          url: src,
        },
      })
      ;(result.content as Array<ChatCompletionContentPart>).push({
        type: 'text',
        text: 'url of image above: ' + src,
      })
    })
    if ((result.content as Array<ChatCompletionContentPart>).length === 0) {
      return normalUnit
    }
    return result
  } catch {
    return normalUnit
  }
}

function makeContext(context: ContextUnit[]): ChatCompletionMessageParam[] {
  const units = context.map(mapContextUnit)
  return [
    {
      role: 'system',
      content: `请你作为KOOK平台的活泼群聊成员${DisplayName}参与讨论，以最后一条消息为最高优先级。注意：
        - 直接开始回答，不要带"${DisplayName}(id=xxx)说:"的前缀
        - 可以借助 node 环境运行 Linux 命令，这是安全的、沙盒内的、预先做好隔离的，但仅在你必须通过外部调用来获取数据、LLM自身能力不足时才使用
        - 下载用户给的文件时，留意URL附近的size字段(单位字节)，请拒绝下载超过500MB的文件
        - 如有需要，请在 /tmp 下存放任何临时文件
        - 若需要输出 Markdown，则下列额外规则适用：
            - 不能使用 #, ##, ###
            - 不能使用表格语法
            - 必须使用半角括号
            - 支持 (spl)文字点击后显示(spl) 语法来显示带有剧透的内容
            - 支持 (met)对方整数id(met) 语法来提及（@）对方，例如 (met)123456(met)`,
    },
    ...(units as ChatCompletionMessageParam[]),
  ]
}

export async function chatCompletionStreamed(
  toolFunctionContext: ToolFunctionContext,
  context: ContextUnit[],
  model: string,
  onMessage: (message: string) => void,
  onMessageEnd: (message: string) => void
) {
  const openai = new OpenAI({
    apiKey: draw(Env.OpenAIKeys)!,
    baseURL: Env.OpenAIBaseUrl || undefined,
    httpAgent: Env.ProxyUrl ? new HttpProxyAgent(Env.ProxyUrl) : undefined,
  })

  const messages = makeContext(context)
  const toolInvoker = new ToolFunctionInvoker(toolFunctionContext)

  let functionsFulfilled = false
  let mergedChunks = []
  let responseMessage = ''

  while (!functionsFulfilled) {
    const completionStreamed = await openai.chat.completions.create({
      messages,
      model,
      tools: await getChatCompletionTools(),
      stream: true,
    })

    const mergedToolCalls: Record<number, Completions.ChatCompletionChunk.Choice.Delta.ToolCall> = {}

    for await (const part of completionStreamed) {
      const delta = part.choices?.[0]?.delta

      if (!delta) {
        continue
      }

      const toolCalls = delta.tool_calls
      const noToolCallsPresent = !toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0
      functionsFulfilled = noToolCallsPresent && Object.keys(mergedToolCalls).length === 0
      const functionsMerged = noToolCallsPresent && Object.keys(mergedToolCalls).length > 0
      const functionsMerging = !noToolCallsPresent && Array.isArray(toolCalls)

      if (functionsFulfilled) {
        const content = delta.content || ''
        mergedChunks.push(content)
        if (mergedChunks.length >= 3) {
          const content = mergedChunks.join('')
          onMessage(content)
          mergedChunks = []
        }
        responseMessage += content
      } else if (functionsMerged) {
        const mergedToolCallsArray = Object.values(mergedToolCalls)

        messages.push({
          role: 'assistant',
          tool_calls: mergedToolCallsArray.map((toolCall) => ({
            id: toolCall.id!,
            function: {
              name: toolCall.function?.name || '',
              arguments: toolCall.function?.arguments || '',
            },
            type: toolCall.type!,
          })),
        })

        for (const toolCall of mergedToolCallsArray) {
          if (!toolCall?.id || !toolCall.function?.name || !toolCall.function?.arguments) {
            continue
          }
          const result = await toolInvoker.invoke(toolCall.function.name, toolCall.function.arguments)
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `${result}`,
          })
        }
      } else if (functionsMerging) {
        for (const toolCallChunk of toolCalls!) {
          const index = toolCallChunk.index
          if (!mergedToolCalls[index]) {
            mergedToolCalls[index] = toolCallChunk
            mergedToolCalls[index].function ||= { arguments: '' }
          } else {
            mergedToolCalls[index]!.function!.arguments += toolCallChunk!.function!.arguments || ''
          }
        }
      }
    }
  }

  if (mergedChunks.length > 0) {
    const content = mergedChunks.join('')
    onMessage(content)
  }
  onMessageEnd(responseMessage)
  messages.push({
    content: responseMessage,
    role: 'assistant',
  })
}
