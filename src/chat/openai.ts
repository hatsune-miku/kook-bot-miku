// import { HttpProxyAgent } from 'http-proxy-agent'
import OpenAI from 'openai'
import { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/resources'
import { draw } from 'radash'

import { ToolFunctionInvoker } from './functional/tool-function'
import { getChatCompletionTools } from './functional/tool-functions/dispatch'
import { ToolFunctionContext } from './functional/types'
import { makeInitialSystemPrompt } from './shared'
import { isReasonerBackend } from './types'

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
      content: makeInitialSystemPrompt('ChatGPT'),
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
    apiKey: draw(Env.OpenAIKeys)!,
    baseURL: Env.OpenAIBaseUrl || undefined,
    // fetch: (url, options) => {
    //   if (Env.ProxyUrl) {
    //     options.agent = new HttpProxyAgent(Env.ProxyUrl)
    //   }
    //   return fetch(url, options)
    // },
  })

  const messages = makeContext(context)
  const toolInvoker = new ToolFunctionInvoker(toolFunctionContext)

  let functionsFulfilled = false
  let mergedChunks: string[] = []
  let responseMessage = ''
  let reasoningSummary = ''
  let totalTokens = 0
  const isReasoner = isReasonerBackend(model as any)

  // Use Responses API for reasoning models
  const conversationInput: any[] = [...messages]
  const queue = new TaskQueue()

  while (!functionsFulfilled) {
    const responseStream = await openai.responses.create({
      model,
      input: conversationInput,
      stream: true,
      tools: await getChatCompletionTools(),
      reasoning: { summary: 'auto' },
    })

    const pendingToolCalls: Map<string, { id: string; callId: string; name: string; arguments: string }> = new Map()
    let hasToolCalls = false

    for await (const event of responseStream) {
      if (event.type === 'response.output_text.delta') {
        const content = event.delta || ''
        mergedChunks.push(content)
        if (mergedChunks.length >= 10) {
          const content = mergedChunks.join('')
          queue.submit(() => onMessage(content))
          mergedChunks = []
        }
        responseMessage += content
      } else if (event.type === 'response.reasoning_summary_text.delta') {
        reasoningSummary += (event as any).delta || ''
      } else if (event.type === 'response.output_item.added') {
        const item = event.item as any
        if (item?.type === 'function_call') {
          hasToolCalls = true
          pendingToolCalls.set(item.id, {
            id: item.id,
            callId: item.call_id || item.id,
            name: item.name || '',
            arguments: '',
          })
        }
      } else if (event.type === 'response.function_call_arguments.delta') {
        const itemId = (event as any).item_id
        const pending = pendingToolCalls.get(itemId)
        if (pending) {
          pending.arguments += event.delta || ''
        }
      } else if (event.type === 'response.completed') {
        const response = event.response
        const usage = response?.usage
        if (usage?.total_tokens) {
          totalTokens += usage.total_tokens
        }

        // Check for function calls in the completed response
        const output = response?.output
        if (Array.isArray(output)) {
          for (const item of output) {
            if (item.type === 'function_call') {
              hasToolCalls = true
              pendingToolCalls.set(item.id, {
                id: item.id,
                callId: item.call_id || item.id,
                name: item.name || '',
                arguments: item.arguments || '',
              })
            }
          }
        }
      }
    }

    if (hasToolCalls && pendingToolCalls.size > 0) {
      // Add function calls to conversation and execute them
      for (const toolCall of pendingToolCalls.values()) {
        if (!toolCall.name) continue
        // Add the function call to conversation
        conversationInput.push({
          type: 'function_call',
          id: toolCall.id,
          call_id: toolCall.callId,
          name: toolCall.name,
          arguments: toolCall.arguments,
        })
        // Execute and add result
        const result = await toolInvoker.invoke(toolCall.name, toolCall.arguments)
        conversationInput.push({
          type: 'function_call_output',
          call_id: toolCall.callId,
          output: `${result}`,
        })
      }
    } else {
      functionsFulfilled = true
    }
  }

  if (mergedChunks.length > 0) {
    const content = mergedChunks.join('')
    queue.submit(() => onMessage(content))
  }
  queue.submit(async () =>
    onMessageEnd(responseMessage, totalTokens, isReasoner && reasoningSummary ? reasoningSummary : null)
  )
  messages.push({
    content: responseMessage,
    role: 'assistant',
  })
}
