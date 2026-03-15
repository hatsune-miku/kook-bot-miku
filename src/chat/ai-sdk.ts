import { jsonSchema, LanguageModel, ModelMessage, streamText, stepCountIs, tool as defineTool } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { draw } from 'radash'

import { KCardElement, KCardModule } from '@kookapp/js-sdk'

import { ToolFunctionInvoker } from './functional/tool-function'
import { getChatCompletionTools } from './functional/tool-functions/dispatch'
import { ToolFunctionContext } from './functional/types'
import { makeInitialSystemPrompt } from './shared'
import { Backend } from './types'

import { TaskQueue } from '../utils/algorithm/task-queue'
import { ContextUnit } from '../utils/config/types'

function createLanguageModel(model: string, backend: Backend): LanguageModel {
  const apiKey = draw(backend.apiKeys)!

  switch (backend.provider) {
    case 'volcengine': {
      const provider = createOpenAICompatible({
        name: 'volcengine',
        baseURL: backend.baseUrl,
        apiKey,
      })
      return provider.chatModel(model)
    }
    case 'google': {
      const provider = createGoogleGenerativeAI({
        apiKey,
        baseURL: backend.baseUrl || undefined,
      })
      return provider(model)
    }
    case 'openai':
    default: {
      const provider = createOpenAI({
        apiKey,
        baseURL: backend.baseUrl || undefined,
      })
      return provider(model)
    }
  }
}

type UserContentPart = { type: 'text'; text: string } | { type: 'image'; image: URL }

function mapContextUnit(unit: ContextUnit, backend: Backend): ModelMessage {
  const normalText = `${unit.authorName}(id=${unit.authorUserId})说: ${unit.content}`
  const normalUnit: ModelMessage = { role: 'user', content: normalText }

  let parsed: any
  try {
    parsed = JSON.parse(unit.content)
  } catch {
    return normalUnit
  }

  if (Array.isArray(parsed)) {
    parsed = parsed[0]
  }

  if (!parsed) {
    return normalUnit
  }

  const message = parsed as KCardElement
  const isCardMessage = message.type === 'card' && message.theme?.length > 1
  if (!isCardMessage) {
    return normalUnit
  }

  const modules = message.modules
  if (!Array.isArray(modules)) {
    return normalUnit
  }

  const processModules = (modules: KCardModule[], onImageFound: (src: string) => void) => {
    for (const m of modules) {
      if (m.type === 'container') {
        processModules(m.elements || [], onImageFound)
      } else if (m.type.includes('image')) {
        onImageFound(m.src)
      }
    }
  }

  const supportsImageParts = backend.provider === 'openai'
  const parts: UserContentPart[] = []

  try {
    processModules(modules, (src) => {
      if (supportsImageParts) {
        parts.push({ type: 'image', image: new URL(src) })
        parts.push({ type: 'text', text: 'url of image above: ' + src })
      } else {
        parts.push({ type: 'text', text: `[Image: ${src}]` })
      }
    })
    if (parts.length === 0) {
      return normalUnit
    }
    return { role: 'user' as const, content: parts }
  } catch {
    return normalUnit
  }
}

function makeContext(context: ContextUnit[], backend: Backend): ModelMessage[] {
  return context.map((unit) => mapContextUnit(unit, backend))
}

async function makeTools(toolFunctionContext: ToolFunctionContext) {
  const openAITools = await getChatCompletionTools()
  const toolInvoker = new ToolFunctionInvoker(toolFunctionContext)

  const tools: Record<string, any> = {}
  for (const t of openAITools) {
    tools[t.name] = defineTool({
      description: t.description || t.name,
      inputSchema: jsonSchema(t.parameters || {}),
      execute: async (params) => {
        return await toolInvoker.invoke(t.name, params)
      },
    })
  }
  return tools
}

export async function chatCompletionStreamed(
  toolFunctionContext: ToolFunctionContext,
  context: ContextUnit[],
  model: string,
  onMessage: (message: string) => Promise<void>,
  onMessageEnd: (message: string, tokens: number, reasoningSummary: string | null) => void,
  backend: Backend
) {
  const languageModel = createLanguageModel(model, backend)
  const messages = makeContext(context, backend)
  const tools = await makeTools(toolFunctionContext)
  const queue = new TaskQueue()

  const result = streamText({
    model: languageModel,
    system: makeInitialSystemPrompt({ modelBrandName: backend.name, overseas: false }),
    messages,
    tools,
    stopWhen: stepCountIs(5),
    providerOptions: backend.provider === 'openai' ? { openai: { reasoningSummary: 'auto' } } : undefined,
  })

  let responseMessage = ''
  let mergedChunks: string[] = []
  let reasoningSummary = ''
  const chunkBatchSize = backend.provider === 'volcengine' ? 50 : 10

  for await (const part of result.fullStream) {
    if (part.type === 'text-delta') {
      mergedChunks.push(part.text)
      if (mergedChunks.length >= chunkBatchSize) {
        const content = mergedChunks.join('')
        queue.submit(() => onMessage(content))
        mergedChunks = []
      }
      responseMessage += part.text
    } else if (part.type === 'reasoning-delta') {
      reasoningSummary += part.text
    }
  }

  if (mergedChunks.length > 0) {
    const content = mergedChunks.join('')
    queue.submit(() => onMessage(content))
  }

  const usage = await result.totalUsage
  queue.submit(async () =>
    onMessageEnd(responseMessage, usage?.totalTokens ?? 0, reasoningSummary || null)
  )
}
