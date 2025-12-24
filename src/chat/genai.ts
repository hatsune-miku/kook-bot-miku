import { draw } from 'radash'

import { Content, GoogleGenAI, Part } from '@google/genai'

import { ToolFunctionInvoker } from './functional/tool-function'
import { getChatCompletionTools } from './functional/tool-functions/dispatch'
import { ToolFunctionContext } from './functional/types'
import { makeInitialSystemPrompt } from './shared'
import { isReasonerBackend } from './types'

import { KCardMessageElement, KCardMessageSubElement } from '../events'
import { TaskQueue } from '../utils/algorithm/task-queue'
import { ContextUnit } from '../utils/config/types'
import { Env } from '../utils/env/env'

function fixSchema(schema: any): any {
  if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
    return { type: 'OBJECT', properties: {} }
  }

  const newSchema: any = { ...schema }

  // Convert type to uppercase if it's a string (Gemini prefers uppercase)
  if (typeof newSchema.type === 'string') {
    newSchema.type = (newSchema.type as string).toUpperCase()
  }

  // Remove fields that Gemini might not like or doesn't support
  delete newSchema.additionalProperties
  delete newSchema.strict

  // Recursively fix properties
  if (newSchema.properties) {
    const newProps: any = {}
    for (const [key, value] of Object.entries(newSchema.properties)) {
      newProps[key] = fixSchema(value)
    }
    newSchema.properties = newProps
  }

  // Recursively fix items for arrays
  if (newSchema.items) {
    newSchema.items = fixSchema(newSchema.items)
  }

  return newSchema
}

function mapContextUnit(unit: ContextUnit): Content {
  const normalUnit: Content = {
    role: 'user',
    parts: [{ text: `${unit.authorName}(id=${unit.authorUserId})说: ${unit.content}` }],
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

  const parts: Part[] = []

  try {
    processModules(modules, (src) => {
      // Gemini can handle image URLs if they are accessible, or base64.
      // For simplicity and matching OpenAI implementation, we'll try to pass the URL.
      // Note: @google/genai's Part type for images usually expects inlineData or fileData.
      // However, some models/environments support passing URLs in text or specific formats.
      // Since @google/genai Part doesn't have a direct image_url like OpenAI,
      // we'll provide the image URL as text for now, as standard @google/genai
      // requires local file upload or base64 for inlineData.
      parts.push({ text: `[Image: ${src}]` })
    })

    if (parts.length === 0) {
      return normalUnit
    }

    return {
      role: 'user',
      parts,
    }
  } catch {
    return normalUnit
  }
}

function makeContext(context: ContextUnit[]): { systemInstruction?: string; contents: Content[] } {
  const contents = context.map(mapContextUnit)
  return {
    systemInstruction: makeInitialSystemPrompt('Google Gemini'),
    contents,
  }
}

export async function chatCompletionStreamed(
  toolFunctionContext: ToolFunctionContext,
  context: ContextUnit[],
  model: string,
  onMessage: (message: string) => Promise<void>,
  onMessageEnd: (message: string, tokens: number, reasoningSummary: string | null) => void
) {
  let baseUrl = Env.GoogleGeminiBaseUrl || undefined
  if (baseUrl) {
    // Strip trailing /v1 or /v1beta to avoid /v1/v1beta redundant paths
    baseUrl = baseUrl.replace(/\/v1$/, '').replace(/\/v1beta$/, '')
  }

  const ai = new GoogleGenAI({
    apiKey: draw(Env.GoogleGeminiKeys)!,
    httpOptions: {
      baseUrl,
    },
  })

  const { systemInstruction, contents } = makeContext(context)
  const toolInvoker = new ToolFunctionInvoker(toolFunctionContext)

  // Convert OpenAI-style tools to Gemini tools
  const openAITools = await getChatCompletionTools()
  const geminiTools =
    openAITools.length > 0
      ? [
          {
            functionDeclarations: openAITools.map((t) => ({
              name: t.name,
              description: t.description || t.name,
              parameters: fixSchema(t.parameters),
            })),
          },
        ]
      : undefined

  // No need for ai.getGenerativeModel in this SDK version
  // It uses ai.models.generateContentStream directly or similar

  let functionsFulfilled = false
  let currentContents = [...contents]
  let responseMessage = ''
  let reasoningSummary = ''
  let totalTokens = 0
  const queue = new TaskQueue()
  const isReasoner = isReasonerBackend(model as any)

  while (!functionsFulfilled) {
    const result = await ai.models.generateContentStream({
      model,
      config: {
        systemInstruction,
        tools: geminiTools,
      },
      contents: currentContents,
    })

    let hasToolCalls = false
    const toolCalls: any[] = []

    for await (const chunk of result) {
      const candidates = chunk.candidates
      if (!candidates || candidates.length === 0) continue

      const candidate = candidates[0]
      const parts = candidate.content?.parts

      if (parts) {
        for (const part of parts) {
          if (part.text) {
            const text = part.text
            responseMessage += text
            queue.submit(() => onMessage(text))
          }
          if (part.thought) {
            reasoningSummary += (part as any).thought || ''
          }
          if (part.functionCall) {
            hasToolCalls = true
            toolCalls.push(part.functionCall)
          }
        }
      }

      const usageMetadata = (chunk as any).usageMetadata
      if (usageMetadata?.totalTokenCount) {
        totalTokens = usageMetadata.totalTokenCount
      }
    }

    if (hasToolCalls) {
      // Gemini expects the assistant's function call part to be followed by a function response part
      const assistantContent: Content = {
        role: 'model',
        parts: toolCalls.map((tc) => ({ functionCall: tc })),
      }
      currentContents.push(assistantContent)

      const functionResponseParts: Part[] = []
      for (const tc of toolCalls) {
        const result = await toolInvoker.invoke(tc.name, tc.args)
        functionResponseParts.push({
          functionResponse: {
            name: tc.name,
            response: { result },
          },
        })
      }

      const functionResponseContent: Content = {
        role: 'user', // In Gemini, function responses are often role: 'user' or handled via ChatSession
        parts: functionResponseParts,
      }
      currentContents.push(functionResponseContent)
    } else {
      functionsFulfilled = true
    }
  }

  queue.submit(async () =>
    onMessageEnd(responseMessage, totalTokens, isReasoner && reasoningSummary ? reasoningSummary : null)
  )
}
