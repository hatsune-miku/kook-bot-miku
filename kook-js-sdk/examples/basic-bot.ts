import { KookClient } from '@kookapp/js-sdk'

// 创建客户端
const client = new KookClient({
  token: process.env.KOOK_BOT_TOKEN!,
})

// 监听文字频道消息
client.on('textChannelEvent', (event) => {
  console.log(`[${event.extra.channel_name}] ${event.extra.author.username}: ${event.content}`)
})

// 监听系统事件
client.on('systemEvent', (event) => {
  console.log('System event:', event.extra.type)
})

// 状态变化
client.on('stateChange', (newState, oldState) => {
  console.log(`State: ${oldState} → ${newState}`)
})

// 连接
await client.connect()
console.log(`Bot ${client.me?.username} is online!`)
