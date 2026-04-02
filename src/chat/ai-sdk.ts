import { jsonSchema, LanguageModel, ModelMessage, streamText, stepCountIs, tool as defineTool } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
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

const MAX_CONTEXT_MESSAGES = 48
const MAX_CONTEXT_CHARS = 32000
const RETRIEVAL_TOP_K = 6

function createLanguageModel(model: string, backend: Backend): LanguageModel {
  const supplier = draw(backend.suppliers)
  if (!supplier) {
    throw new Error(`provider ${backend.provider} 未配置可用 suppliers`)
  }
  const apiKey = supplier.apiKey
  const baseUrl = supplier.baseUrl || undefined

  switch (backend.provider) {
    case 'volcengine': {
      const provider = createOpenAICompatible({
        name: 'volcengine',
        baseURL: baseUrl,
        apiKey,
      })
      return provider.chatModel(model)
    }
    case 'google': {
      const provider = createGoogleGenerativeAI({
        apiKey,
        baseURL: baseUrl,
      })
      return provider(model)
    }
    case 'anthropic': {
      const provider = createAnthropic({
        apiKey,
        baseURL: baseUrl,
      })
      return provider(model)
    }
    case 'openai':
    default: {
      const provider = createOpenAI({
        apiKey,
        baseURL: baseUrl,
      })
      return provider(model)
    }
  }
}

type UserContentPart = { type: 'text'; text: string } | { type: 'image'; image: URL }

function extractSearchText(rawContent: string): string {
  if (!rawContent) {
    return ''
  }
  try {
    const parsed = JSON.parse(rawContent)
    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed).slice(0, 1000)
    }
    if (typeof parsed === 'object') {
      return JSON.stringify(parsed).slice(0, 1000)
    }
  } catch {
    // no-op
  }
  return rawContent
}

function tokenizeForSearch(text: string): string[] {
  const lowered = text.toLowerCase()
  const terms = lowered.match(/[a-z0-9_\-\.]{2,}|[\u4e00-\u9fff]{2,}/g) || []
  return Array.from(new Set(terms)).slice(0, 20)
}

function scoreCandidate(unit: ContextUnit, terms: string[], now: number): number {
  if (terms.length === 0) {
    return 0
  }
  const haystack = `${unit.authorName} ${extractSearchText(unit.content)}`.toLowerCase()
  let hitScore = 0
  for (const term of terms) {
    if (haystack.includes(term)) {
      hitScore += term.length >= 6 ? 2 : 1
    }
  }
  if (hitScore === 0) {
    return 0
  }

  const ageHours = Math.max(0, (now - unit.createdAt) / (1000 * 60 * 60))
  const recencyBoost = 1 / (1 + ageHours / 24)
  return hitScore + recencyBoost
}

function pickRetrievedContext(olderUnits: ContextUnit[], latestUserText: string): ContextUnit[] {
  const terms = tokenizeForSearch(latestUserText)
  const now = Date.now()
  const scored = olderUnits
    .map((unit) => ({ unit, score: scoreCandidate(unit, terms, now) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, RETRIEVAL_TOP_K)
    .map((x) => x.unit)

  return scored.sort((a, b) => a.createdAt - b.createdAt)
}

function applyContextBudget(units: ContextUnit[]): ContextUnit[] {
  const picked: ContextUnit[] = []
  let totalChars = 0
  for (let i = units.length - 1; i >= 0; i--) {
    const unit = units[i]
    const size = (unit.authorName?.length || 0) + (unit.content?.length || 0)
    if (picked.length >= MAX_CONTEXT_MESSAGES) {
      continue
    }
    if (totalChars + size > MAX_CONTEXT_CHARS) {
      continue
    }
    picked.push(unit)
    totalChars += size
  }
  return picked.reverse()
}

function selectContextUnitsForPrompt(context: ContextUnit[]): ContextUnit[] {
  if (context.length <= MAX_CONTEXT_MESSAGES) {
    return applyContextBudget(context)
  }

  const latestUnit = context[context.length - 1]
  const latestText = extractSearchText(latestUnit?.content || '')
  const olderUnits = context.slice(0, -MAX_CONTEXT_MESSAGES)
  const retrieved = pickRetrievedContext(olderUnits, latestText)

  const reservedSlots = Math.min(retrieved.length, Math.max(0, MAX_CONTEXT_MESSAGES - 1))
  const recentLimit = MAX_CONTEXT_MESSAGES - reservedSlots
  const recent = context.slice(-recentLimit)

  const mergedMap = new Map<string, ContextUnit>()
  for (const unit of [...retrieved, ...recent]) {
    mergedMap.set(unit.messageId, unit)
  }
  const merged = Array.from(mergedMap.values()).sort((a, b) => a.createdAt - b.createdAt)
  return applyContextBudget(merged)
}

function mapContextUnit(unit: ContextUnit, backend: Backend, supportsImageParts: boolean): ModelMessage {
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

function makeContext(
  context: ContextUnit[],
  backend: Backend,
  supportsImageParts: boolean
): { messages: ModelMessage[]; usedImageParts: boolean } {
  const messages = context.map((unit) => mapContextUnit(unit, backend, supportsImageParts))
  const usedImageParts = messages.some(
    (m) => Array.isArray(m.content) && m.content.some((part: any) => part?.type === 'image')
  )
  return { messages, usedImageParts }
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
  const selectedContext = selectContextUnitsForPrompt(context)
  const languageModel = createLanguageModel(model, backend)
  const tools = await makeTools(toolFunctionContext)
  const queue = new TaskQueue()

  const runStream = async (supportsImageParts: boolean) => {
    const { messages, usedImageParts } = makeContext(selectedContext, backend, supportsImageParts)
    const result = streamText({
      model: languageModel,
      system: makeInitialSystemPrompt({ modelBrandName: backend.provider, overseas: false }),
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
    return usedImageParts
  }

  const { usedImageParts } = makeContext(selectedContext, backend, backend.capabilities.vision)
  try {
    await runStream(backend.capabilities.vision)
  } catch (error) {
    const shouldRetryAsTextOnly = backend.capabilities.vision && usedImageParts
    if (!shouldRetryAsTextOnly) {
      throw error
    }
    await runStream(false)
  }
}
