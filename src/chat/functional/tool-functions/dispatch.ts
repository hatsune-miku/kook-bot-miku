import { ChatCompletionTool } from 'openai/resources'
import { map } from 'radash'

import { DownloadFileTool } from './DownloadFile'
import { DrawImageStableDiffusionTool } from './DrawImageStableDiffusion'
import { EvaluateJavaScriptTool } from './EvaluateJavaScript'
import { EvaluatePythonTool } from './EvaluatePython'
import { GetStandardTimeTool } from './GetStandardTime'
import { QWeatherTool } from './QWeather'
import { RunLinuxCommandTool } from './RunLinuxCommand'
import { SendFileTool } from './SendFile'
import { SetCountdownTool } from './SetCountdown'

import { pluginLoader } from '../../../plugins/loader'
import { ToolFunctionContext } from '../types'

export interface IFunctionTool {
  invoke(context: ToolFunctionContext, params: any): Promise<string>
  defineOpenAICompletionTool(): Promise<ChatCompletionTool>
}

export const toolFunctions: IFunctionTool[] = [
  SetCountdownTool,
  EvaluateJavaScriptTool,
  GetStandardTimeTool,
  QWeatherTool,
  RunLinuxCommandTool,
  DownloadFileTool,
  EvaluatePythonTool,
  DrawImageStableDiffusionTool,
  SendFileTool,
].map((Tool) => new Tool())

export const toolDefinitionCache: Record<string, [IFunctionTool, ChatCompletionTool]> = {}

export async function getChatCompletionTools(): Promise<ChatCompletionTool[]> {
  if (Object.keys(toolDefinitionCache).length > 0) {
    return Object.values(toolDefinitionCache).map(([_, defined]) => defined)
  }

  pluginLoader.plugins.forEach((p) => {
    p.providedTools?.forEach((t) => {
      toolFunctions.push(t)
    })
  })

  await map(toolFunctions, async (t) => {
    const defined = await t.defineOpenAICompletionTool()
    toolDefinitionCache[defined.function.name] = [t, defined]
  })
  return Object.values(toolDefinitionCache).map(([_, defined]) => defined)
}

export function dispatchTool(name: string): IFunctionTool {
  return toolDefinitionCache[name]?.[0]
}
