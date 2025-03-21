import * as lark from "@larksuiteoapi/node-sdk"
import { Requests } from "../../utils/krequest/request"
import { KEventType } from "../kwebsocket/types"
import { Env } from "../../utils/env/env"
import { info } from "../../utils/logging/logger"

export async function initializeLarkBot() {
  if (!Env.LarkAppId || !Env.LarkAppSecret) {
    info("Lark bot not enabled")
    return
  }

  const baseConfig = {
    appId: Env.LarkAppId,
    appSecret: Env.LarkAppSecret
  }

  const client = new lark.Client(baseConfig)
  const wsClient = new lark.WSClient({
    ...baseConfig,
    loggerLevel: lark.LoggerLevel.debug
  })

  wsClient.start({
    eventDispatcher: new lark.EventDispatcher({}).register({
      "im.message.receive_v1": async (data) => {
        const {
          message: { chat_id, content }
        } = data

        let parsed: any
        try {
          parsed = JSON.parse(content)
        } catch {
          return
        }

        const { text } = parsed
        if (!text) {
          return
        }

        const components = text.split(" ") as string[]
        const directive = components[0]
        const parameters = components.slice(1).filter((x) => x.length > 0)

        if (directive === "打包") {
          const [branch] = parameters
          Requests.createChannelMessage({
            type: KEventType.KMarkdown,
            target_id: "9881678244960302",
            content: `(met)1211389071(met) /打包 ${branch}`
          })
          await client.im.v1.message.create({
            params: {
              receive_id_type: "chat_id"
            },
            data: {
              receive_id: chat_id,
              content: lark.messageCard.defaultCard({
                title: "已通知打包嘟嘟",
                content: `大概 5 分钟后目标分支 (${branch}) 即可打包完成。网址：https://gz-www.dev.chuanyuapp.com/`
              }),
              msg_type: "interactive"
            }
          })
        }
      }
    })
  })
}
