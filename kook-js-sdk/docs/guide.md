# @kookapp/js-sdk 快速上手指南

## 安装

```bash
npm install @kookapp/js-sdk
# or
yarn add @kookapp/js-sdk
```

## 基本用法

### 最简机器人

```typescript
import { KookClient } from '@kookapp/js-sdk'

const client = new KookClient({
  token: 'your-bot-token',
})

client.on('textChannelEvent', (event) => {
  console.log(`${event.extra.author.username}: ${event.content}`)
})

await client.connect()
```

### 发送消息

```typescript
import { KEventTypes } from '@kookapp/js-sdk'

// 发送 KMarkdown 消息
await client.api.createMessage({
  type: KEventTypes.KMarkdown,
  target_id: 'channel-id',
  content: '**Hello World!**',
})

// 发送卡片消息
import { CardBuilder } from '@kookapp/js-sdk'

const card = CardBuilder.fromTemplate()
  .theme('primary')
  .addHeader('欢迎')
  .addKMarkdownText('这是一条卡片消息')
  .addDivider()
  .addContext('Powered by @kookapp/js-sdk')
  .build()

await client.api.createMessage({
  type: KEventTypes.Card,
  target_id: 'channel-id',
  content: card,
})
```

## 指令系统

```typescript
import { KookClient, KEventTypes } from '@kookapp/js-sdk'

const client = new KookClient({ token: 'your-token' })

// 注册指令
client.registerDirective({
  triggerWord: 'ping',
  parameterDescription: '',
  description: '检查机器人状态',
  permissionGroups: ['everyone'],
  handler: async (context) => {
    await client.api.createMessage({
      type: KEventTypes.KMarkdown,
      target_id: context.event.target_id,
      content: 'Pong!',
    })
  },
})

// 创建分发器并监听
const dispatcher = client.createDispatcher()
client.on('textChannelEvent', (event) => dispatcher.dispatch(event))
await client.connect()
```

## 插件系统

```typescript
import { KookClient } from '@kookapp/js-sdk'
import { StandardTimePlugin } from '@kookapp/js-sdk/plugins/standard-time'

const client = new KookClient({ token: 'your-token' })
await client.use(new StandardTimePlugin())
```

### 编写自定义插件

```typescript
import { KookPlugin, PluginContext } from '@kookapp/js-sdk'

class MyPlugin implements KookPlugin {
  name = 'my-plugin'
  description = '自定义插件'

  async onLoad(context: PluginContext) {
    context.logger.info('Plugin loaded!')
  }

  providedDirectives = [
    {
      triggerWord: 'greet',
      parameterDescription: '<名字>',
      description: '打招呼',
      permissionGroups: ['everyone'],
      handler: async (context) => {
        // 处理指令...
      },
    },
  ]
}
```

## 内置插件

| 插件 | 导入路径 | 功能 |
|------|----------|------|
| `StandardTimePlugin` | `@kookapp/js-sdk/plugins/standard-time` | 获取北京时间 |
| `EvalJsPlugin` | `@kookapp/js-sdk/plugins/eval-js` | 执行 JavaScript |
| `EvalPythonPlugin` | `@kookapp/js-sdk/plugins/eval-python` | 执行 Python |
| `RunCommandPlugin` | `@kookapp/js-sdk/plugins/run-command` | 执行 Shell 命令 |
| `SetCountdownPlugin` | `@kookapp/js-sdk/plugins/countdown` | 倒计时卡片 |
| `DownloadFilePlugin` | `@kookapp/js-sdk/plugins/download-file` | 下载文件 |
| `SendFilePlugin` | `@kookapp/js-sdk/plugins/send-file` | 发送文件 |

## API 参考

### KookClient

| 方法/属性 | 说明 |
|-----------|------|
| `connect()` | 连接到 KOOK |
| `disconnect()` | 断开连接 |
| `on(event, handler)` | 注册事件监听 |
| `off(event, handler)` | 移除事件监听 |
| `api` | REST API 客户端 |
| `ws` | WebSocket 客户端 |
| `me` | Bot 用户信息 |
| `registerDirective(item)` | 注册指令 |
| `use(plugin)` | 加载插件 |
| `createDispatcher(config?)` | 创建指令分发器 |

### 事件类型

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `textChannelEvent` | `(event, sn)` | 文字频道消息 |
| `systemEvent` | `(event, sn)` | 系统事件 |
| `event` | `(event, sn)` | 所有事件 |
| `stateChange` | `(newState, oldState)` | 连接状态变化 |
| `open` | - | WebSocket 已连接 |
| `close` | - | WebSocket 已断开 |
| `error` | `(error)` | 错误 |
| `reset` | - | 连接重置 |

### RestClient API 方法

完整的 KOOK REST API 封装，包括：
- 消息：`createMessage`, `updateMessage`, `deleteMessage`, `addReaction`
- 资源：`uploadAsset`
- 用户：`getSelfUser`, `getUser`
- 服务器：`listGuilds`, `viewGuild`, `listGuildMembers`
- 频道：`listChannels`, `viewChannel`, `createChannel`, `deleteChannel`
- 角色：`listGuildRoles`, `createGuildRole`, `updateGuildRole`, `grantRole`, `revokeRole`
- 私信：`createDirectMessage`, `listDirectMessages`
- 聊天会话：`listUserChats`, `createUserChat`
