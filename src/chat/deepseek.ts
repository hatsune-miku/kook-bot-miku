import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources'
import { ChatCompletionContentPart, Completions } from 'openai/resources/chat'
import { draw } from 'radash'

import { ToolFunctionInvoker } from './functional/tool-function'
import { getChatCompletionToolsCompat } from './functional/tool-functions/dispatch'
import { ToolFunctionContext } from './functional/types'
import { makeInitialSystemPrompt } from './shared'

import { KCardMessageElement, KCardMessageSubElement } from '../events'
import { TaskQueue } from '../utils/algorithm/task-queue'
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
        type: 'text',
        text: 'image url attached: ' + src,
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
      content: makeInitialSystemPrompt({ modelBrandName: 'DeepSeek', overseas: false }),
    },
    ...(units as ChatCompletionMessageParam[]),
  ]
}

export async function chatCompletionStreamed(
  toolFunctionContext: ToolFunctionContext,
  context: ContextUnit[],
  model: string,
  onMessage: (message: string) => Promise<void>,
  onMessageEnd: (message: string, tokens: number, reasoningSummary: string | null) => void
) {
  const openai = new OpenAI({
    // baseURL: "https://api.deepseek.com",
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: draw(Env.VolcKeys)!,
  })

  const messages = makeContext(context)
  const toolInvoker = new ToolFunctionInvoker(toolFunctionContext)

  let functionsFulfilled = false
  let mergedChunks = []
  let responseMessage = ''
  const queue = new TaskQueue()

  while (!functionsFulfilled) {
    const completionStreamed = await openai.chat.completions.create({
      messages,
      model: model,
      tools: await getChatCompletionToolsCompat(),
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
        if (mergedChunks.length >= 50) {
          const content = mergedChunks.join('')
          queue.submit(() => onMessage(content))
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
    queue.submit(() => onMessage(content))
  }
  queue.submit(async () => onMessageEnd(responseMessage, 0, null))
  messages.push({
    content: responseMessage,
    role: 'assistant',
  })
}
