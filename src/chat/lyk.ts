import { ContextUnit } from 'src/utils/config/types'

import { ToolFunctionContext } from './functional/types'

export async function chatCompletionStreamed(
  _0: ToolFunctionContext,
  context: ContextUnit[],
  _1: string,
  onMessage: (message: string) => Promise<void>,
  onMessageEnd: (message: string, tokens: number, reasoningSummary: string | null) => void
) {
  if (context.length === 0) {
    return
  }
  const lastContext = context[context.length - 1]
  let prompt = lastContext.content
  prompt = prompt.replace(/吗/g, '')
  prompt = prompt.replace(/不/g, '')
  prompt = prompt.replace(/你/g, '我')
  prompt = prompt.replace(/有/g, '没有')
  prompt = prompt.replace(/吧/g, '')
  prompt = prompt.replace(/？/g, '！')
  setTimeout(() => {
    onMessage(prompt)
    setTimeout(() => {
      onMessageEnd(prompt, 0, null)
    }, 1000)
  }, 1000)
}
