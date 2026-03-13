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

import { TaskQueue } from '../utils/algorithm/task-queue'
import { ContextUnit } from '../utils/config/types'
import { Env } from '../utils/env/env'

function getModelBrandName(model: string): string {
  if (model.startsWith('deepseek')) return 'DeepSeek'
  if (model.startsWith('gemini')) return 'Google Gemini'
  return 'ChatGPT'
}

function createLanguageModel(model: string): LanguageModel {
  if (model.startsWith('deepseek')) {
    const provider = createOpenAICompatible({
      name: 'volcengine',
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      apiKey: draw(Env.VolcKeys)!,
    })
    return provider.chatModel(model)
  }

  if (model.startsWith('gemini')) {
    let baseURL = Env.GoogleGeminiBaseUrl || undefined
    if (baseURL) {
      baseURL = baseURL.replace(/\/v1$/, '').replace(/\/v1beta$/, '')
    }
    const provider = createGoogleGenerativeAI({
      apiKey: draw(Env.GoogleGeminiKeys)!,
      baseURL,
    })
    return provider(model)
  }

  // Default: OpenAI
  const provider = createOpenAI({
    apiKey: draw(Env.OpenAIKeys)!,
    baseURL: Env.OpenAIBaseUrl || undefined,
  })
  return provider(model)
}

type UserContentPart = { type: 'text'; text: string } | { type: 'image'; image: URL }

function mapContextUnit(unit: ContextUnit, model: string): ModelMessage {
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

  const parts: UserContentPart[] = []

  try {
    processModules(modules, (src) => {
      if (model.startsWith('deepseek') || model.startsWith('gemini')) {
        // DeepSeek and Gemini: pass image URLs as text
        parts.push({ type: 'text', text: `[Image: ${src}]` })
      } else {
        // OpenAI: pass as image part
        parts.push({ type: 'image', image: new URL(src) })
        parts.push({ type: 'text', text: 'url of image above: ' + src })
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

function makeContext(context: ContextUnit[], model: string): ModelMessage[] {
  return context.map((unit) => mapContextUnit(unit, model))
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
  onMessageEnd: (message: string, tokens: number, reasoningSummary: string | null) => void
) {
  const languageModel = createLanguageModel(model)
  const messages = makeContext(context, model)
  const tools = await makeTools(toolFunctionContext)
  const queue = new TaskQueue()

  const isOpenAI = !model.startsWith('deepseek') && !model.startsWith('gemini')

  const result = streamText({
    model: languageModel,
    system: makeInitialSystemPrompt({ modelBrandName: getModelBrandName(model), overseas: false }),
    messages,
    tools,
    stopWhen: stepCountIs(5),
    providerOptions: isOpenAI ? { openai: { reasoningSummary: 'auto' } } : undefined,
  })

  let responseMessage = ''
  let mergedChunks: string[] = []
  let reasoningSummary = ''
  const chunkBatchSize = model.startsWith('deepseek') ? 50 : 10

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
