import { KookClient } from '@kookapp/js-sdk'
import { StandardTimePlugin } from '@kookapp/js-sdk/plugins/standard-time'
import { EvalJsPlugin } from '@kookapp/js-sdk/plugins/eval-js'

// 创建客户端
const client = new KookClient({
  token: process.env.KOOK_BOT_TOKEN!,
})

// 加载插件
await client.use(new StandardTimePlugin())
await client.use(new EvalJsPlugin())

// 创建指令分发器
const dispatcher = client.createDispatcher({
  onPermissionDenied: async (context) => {
    await client.api.createMessage({
      type: 9,
      target_id: context.event.target_id,
      content: '权限不足',
      quote: context.event.msg_id,
    })
  },
})

// 监听消息，分发指令
client.on('textChannelEvent', async (event) => {
  await dispatcher.dispatch(event)
})

// 连接
await client.connect()
console.log(`Bot ${client.me?.username} is online with plugins:`)
for (const plugin of client.plugins.plugins) {
  console.log(`  - ${plugin.name}: ${plugin.description}`)
}
