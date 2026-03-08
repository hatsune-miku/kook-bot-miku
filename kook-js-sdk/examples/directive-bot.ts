import { KookClient, KEventTypes } from '@kookapp/js-sdk'

// 创建客户端
const client = new KookClient({
  token: process.env.KOOK_BOT_TOKEN!,
})

// 注册指令
client.registerDirective({
  triggerWord: ['ping', 'p'],
  parameterDescription: '',
  description: '检查机器人是否在线',
  permissionGroups: ['everyone'],
  handler: async (context) => {
    await client.api.createMessage({
      type: KEventTypes.KMarkdown,
      target_id: context.event.target_id,
      content: '**Pong!** :white_check_mark:',
      quote: context.event.msg_id,
    })
  },
})

client.registerDirective({
  triggerWord: 'echo',
  parameterDescription: '<文本>',
  description: '复读机',
  permissionGroups: ['everyone'],
  handler: async (context) => {
    await client.api.createMessage({
      type: KEventTypes.KMarkdown,
      target_id: context.event.target_id,
      content: context.parameter ?? '你什么都没说',
      quote: context.event.msg_id,
    })
  },
})

// 创建指令分发器
const dispatcher = client.createDispatcher()

// 监听消息，分发指令
client.on('textChannelEvent', async (event) => {
  await dispatcher.dispatch(event)
})

// 连接
await client.connect()
console.log(`Bot ${client.me?.username} is online with ${client.directives.getAll().length} directives!`)
