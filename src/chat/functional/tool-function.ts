import { dispatchTool } from './tool-functions/dispatch'
import { ToolFunctionContext } from './types'

import { warn } from '../../utils/logging/logger'

function prettyParams(params: any): string {
  try {
    const raw = JSON.stringify(params ?? {}, null, 2)
    if (raw.length <= 300) {
      return raw
    }
    return raw.slice(0, 300) + '...'
  } catch {
    return String(params)
  }
}

function emitToolCallStart(context: ToolFunctionContext, name: string, params: any) {
  context.onMessage(
    `\n\n[Tool] ${name}\n` + `参数:\n\`\`\`json\n${prettyParams(params)}\n\`\`\`\n`
  )
}

function emitToolCallEnd(context: ToolFunctionContext, name: string, ok: boolean, detail?: string) {
  const status = ok ? '成功' : '失败'
  const suffix = detail ? `\n说明: ${detail}` : ''
  context.onMessage(`\n[Tool] ${name} ${status}${suffix}\n`)
}

export class ToolFunctionInvoker {
  constructor(private context: ToolFunctionContext) {}

  async invoke(name: string, params: any): Promise<string> {
    const tool = dispatchTool(name)
    if (!tool) {
      warn(`[ToolFunctionInvoker] Tool not found: ${name}`)
    }

    try {
      if (typeof params === 'string') {
        params = JSON.parse(params)
      }
    } catch {
      warn(`[ToolFunctionInvoker] Failed to parse params: ${JSON.stringify(params)}`)
      return '调用失败：JSON parse failed'
    }

    emitToolCallStart(this.context, name, params)
    try {
      const result = await tool.invoke(this.context, params)
      emitToolCallEnd(this.context, name, true)
      return result
    } catch (e: any) {
      const message = e?.message || 'unknown error'
      emitToolCallEnd(this.context, name, false, message)
      return `调用失败：${message}`
    }
  }
}
