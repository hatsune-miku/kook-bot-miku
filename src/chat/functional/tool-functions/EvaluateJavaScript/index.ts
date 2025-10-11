import { ChatCompletionTool } from "openai/resources"
import { IFunctionTool } from "../dispatch"
import { ToolFunctionContext } from "../../context"
import { sleep } from "radash"
import { info } from "../../../../utils/logging/logger"
import { createCodeBlock } from "../../../../backend/controllers/code"

export class EvaluateJavaScriptTool implements IFunctionTool {
  async defineOpenAICompletionTool(): Promise<ChatCompletionTool> {
    return {
      type: "function",
      function: {
        name: "javaScriptEvalSandboxed",
        description:
          "与 JavaScript eval 用法相同，但运行于隔离的node环境，不会造成任何破坏、也可以安全放心地访问文件系统，或是运行任何 Linux 命令。只在有需要时使用。仅在你别无选择、必须通过外部调用来获取数据、LLM自身能力不足时才使用。",
        parameters: {
          type: "object",
          properties: {
            expression: {
              type: "string",
              description:
                "一个合法的 JavaScript 表达式，同样也可以使用 node 提供的全局对象如 Math, Date 等"
            }
          },
          required: ["expression"],
          additionalProperties: false
        },
        strict: false
      }
    }
  }
  async invoke(context: ToolFunctionContext, params: any): Promise<string> {
    info(`[Chat] Evaluate js expression`, params)
    const { expression, showCommand = true } = params

    if (
      showCommand &&
      context.event?.extra?.guild_id &&
      context.event?.target_id
    ) {
      createCodeBlock({
        guildId: context.event.extra.guild_id,
        channelId: context.event.target_id,
        code: expression,
        language: "JavaScript",
        markdownCodeLanguage: "js"
      })
      await sleep(100)
    }

    try {
      const result = eval(expression)
      info(`[Chat] Eval result`, result)
      return result
    } catch (e: any) {
      return `执行失败: ${e?.message || "未知错误"}`
    }
  }
}
