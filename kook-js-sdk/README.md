# @kookapp/js-sdk

KOOK Bot JavaScript/TypeScript SDK, providing WebSocket connection management, REST API client, card message builder, directive system, and plugin system.

## Installation

```bash
npm install @kookapp/js-sdk
# or
yarn add @kookapp/js-sdk
```

## Quick Start

```typescript
import { KookClient } from '@kookapp/js-sdk'

const client = new KookClient({
  botToken: 'your-bot-token',
})

client.on('textChannelEvent', (event) => {
  console.log(`${event.extra.author.username}: ${event.content}`)
})

client.on('systemEvent', (event) => {
  console.log('System event:', event.extra.type)
})

await client.connect()
```

### Obtaining a Bot Token

1. Go to the [KOOK Developer Platform](https://developer.kookapp.cn/)
2. Create or select an application
3. Navigate to the "Bot" page and copy the Token

## Core Modules

### KookClient

Top-level client that combines WebSocket, REST API, directive, and plugin systems.

```typescript
import { KookClient } from '@kookapp/js-sdk'

const client = new KookClient({
  botToken: 'your-token',
  baseUrl: 'https://www.kookapp.cn',  // optional, default
  compression: true,                   // optional, WebSocket compression
  autoReconnect: true,                 // optional, auto reconnect on disconnect
  timing: { heartbeatIntervalMs: 30000 }, // optional, WebSocket timing
})

await client.connect()

// Bot info (available after connect)
console.log(client.me?.username)

// Event listeners
client.on('textChannelEvent', (event, sn) => { /* ... */ })
client.on('systemEvent', (event, sn) => { /* ... */ })
client.on('event', (event, sn) => { /* ... */ })
client.on('stateChange', (newState, oldState) => { /* ... */ })
client.on('open', () => { /* ... */ })
client.on('close', () => { /* ... */ })
client.on('error', (message) => { /* ... */ })
client.on('reset', () => { /* ... */ })

// Disconnect
client.disconnect()
```

### RestClient

HTTP API client with automatic rate limiting.

```typescript
// Access via client.api
const result = await client.api.createMessage({
  type: 9, // KMarkdown
  target_id: 'channel-id',
  content: 'Hello!',
})

if (result.success) {
  console.log('Message sent:', result.data.msg_id)
}
```

All API methods return `KResponseExt<T>` with `{ success: boolean, code: number, message: string, data: T }`. They never throw.

Available methods:

| Method | Description |
|--------|-------------|
| `createMessage(props)` | Send a message to a channel |
| `updateMessage(props)` | Update an existing message |
| `deleteMessage(props)` | Delete a message |
| `addReaction(props)` | Add a reaction to a message |
| `deleteReaction(props)` | Remove a reaction |
| `uploadAsset(formData)` | Upload a file and get its URL |
| `getSelfUser()` | Get the bot's own user info |
| `getUser(props)` | Get a user's info |
| `listGuilds()` | List guilds the bot is in |
| `viewGuild(props)` | Get guild details |
| `listGuildMembers(props)` | List members of a guild |
| `listChannels(props)` | List channels of a guild |
| `createChannel(props)` | Create a channel |
| `deleteChannel(props)` | Delete a channel |
| `listGuildRoles(props)` | List guild roles |
| `createGuildRole(props)` | Create a guild role |
| `grantRole(props)` | Grant a role to a user |
| `revokeRole(props)` | Revoke a role from a user |
| `createDirectMessage(props)` | Send a direct message |
| `request(url, method, data?)` | Raw API request |

For a standalone RestClient (without WebSocket):

```typescript
import { RestClient } from '@kookapp/js-sdk'

const api = new RestClient({ token: 'your-token' })
const result = await api.createMessage({ type: 9, target_id: '...', content: '...' })
```

### CardBuilder

Chainable builder for KOOK card messages.

```typescript
import { CardBuilder } from '@kookapp/js-sdk'

const card = CardBuilder.fromTemplate({ initialCard: { theme: 'info' } })
  .addHeader('Title')
  .addKMarkdownText('**Bold** text')
  .addDivider()
  .addImage('https://example.com/image.png')
  .addContext('Footer text')
  .build()

await client.api.createMessage({
  type: 10, // Card
  target_id: 'channel-id',
  content: card,
})
```

Available methods:

| Method | Description |
|--------|-------------|
| `.theme(theme)` | Set card theme: `primary`, `secondary`, `info`, `warning`, `danger`, `success` |
| `.size(size)` | Set card size: `sm`, `lg` |
| `.color(hex)` | Set card border color |
| `.addHeader(text)` | Add a header |
| `.addKMarkdownText(content)` | Add KMarkdown text section |
| `.addPlainText(text)` | Add plain text section |
| `.addIconWithKMarkdownText(iconUrl, text)` | Add text with icon |
| `.addImage(url)` | Add an image container |
| `.addFile(title, url, size)` | Add a file module |
| `.addDivider()` | Add a divider |
| `.addContext(text)` | Add plain text context |
| `.addKMarkdownContext(content)` | Add KMarkdown context |
| `.addActionGroup(buttons)` | Add a button group |
| `.addHourCountDown(endAt)` | Add hour countdown |
| `.addDayCountDown(endAt)` | Add day countdown |
| `.addSecondCountDown(endAt)` | Add second countdown |
| `.undoLastAdd()` | Remove the last added module |
| `.createSnapshot()` | Create a snapshot for rollback (returns `CardSnapshot \| null`) |
| `.restore(snapshot)` | Restore from a snapshot |
| `.build()` | Serialize to JSON string |
| `.serializedLength` | Get the serialized length |
| `.lastModule` | Get the last module |

### Directive System

Register slash-style commands (`/command parameter`) with permission control.

```typescript
// Register a directive
client.registerDirective({
  triggerWord: 'ping',        // or ['ping', 'p'] for aliases
  description: 'Ping pong',
  parameterDescription: '',
  permissionGroups: ['everyone'],
  handler: async (context) => {
    await client.api.createMessage({
      type: 9,
      target_id: context.event.target_id,
      content: 'Pong!',
      quote: context.event.msg_id,
    })
  },
})

// Create a dispatcher
const dispatcher = client.createDispatcher({
  permissionResolver: (userId, userRoles, required) => {
    if (required.includes('everyone')) return true
    return userRoles.some(r => required.includes(r))
  },
  onPermissionDenied: async (context) => {
    await client.api.createMessage({
      type: 9,
      target_id: context.event.target_id,
      content: 'Permission denied',
    })
  },
})

// In your event handler
client.on('textChannelEvent', async (event) => {
  const handled = await dispatcher.dispatch(event)
  if (!handled) {
    // Not a directive, handle as normal message
  }
})
```

The `DirectiveContext` passed to handlers contains:

```typescript
interface DirectiveContext {
  event: KEvent<KTextChannelExtra>  // Original event
  directive: string                  // Matched directive name
  parameter: string | undefined      // Parameter after the directive
  user: KUser                        // Author of the message
  mentionRoleIds: number[]           // Mentioned role IDs
  mentionUserIds: string[]           // Mentioned user IDs
}
```

### Plugin System

Extend the bot with reusable plugins.

```typescript
import { KookPlugin, PluginContext } from '@kookapp/js-sdk'

const myPlugin: KookPlugin = {
  name: 'my-plugin',
  description: 'A custom plugin',

  async onLoad(context: PluginContext) {
    context.logger.info('Plugin loaded!')
  },

  onUnload() {
    // Cleanup
  },

  // Optional: provide directives
  providedDirectives: [
    {
      triggerWord: 'hello',
      description: 'Say hello',
      parameterDescription: '',
      permissionGroups: ['everyone'],
      handler: async (context) => {
        // ...
      },
    },
  ],
}

await client.use(myPlugin)
```

Plugin lifecycle hooks:

| Hook | Description |
|------|-------------|
| `onLoad(context)` | Called when the plugin is loaded |
| `onUnload()` | Called when the plugin is unloaded |
| `onReset()` | Called when the WebSocket connection is reset |
| `onEvent(event, sn?)` | Called for all events |
| `onTextChannelEvent(event, sn?)` | Called for text channel events |
| `onSystemEvent(event, sn?)` | Called for system events |

### Built-in Plugins

The SDK includes several ready-to-use plugins under `@kookapp/js-sdk/plugins/*`:

| Plugin | Directive | Description |
|--------|-----------|-------------|
| `StandardTimePlugin` | `/time`, `/now` | Get current Beijing time |
| `SetCountdownPlugin` | `/countdown`, `/cd` | Set a countdown timer |
| `EvalJsPlugin` | `/eval-js`, `/js` | Execute JavaScript code |
| `EvalPythonPlugin` | `/eval-py`, `/py` | Execute Python 3 code |
| `RunCommandPlugin` | `/run`, `/sh` | Execute shell commands |
| `SendFilePlugin` | `/send-file` | Upload and send local files |
| `DownloadFilePlugin` | `/download` | Download files from URL |

## Types

Common types exported from the SDK:

```typescript
import type {
  KEvent,              // WebSocket event
  KTextChannelExtra,   // Text channel event extra data
  KSystemEventExtra,   // System event extra data
  KUser,               // User info
  KSelfUser,           // Bot's own user info
  KUserDetail,         // Detailed user info
  KGuild,              // Guild info
  KRole,               // Role info
  KCardMessage,        // Card message structure
  KCardElement,        // Card element
  KCardModule,         // Card module
  KResponse,           // API response
  KResponseExt,        // Extended API response with success flag
  KWSState,            // WebSocket connection state
  WsTimingConfig,      // WebSocket timing configuration
  CreateMessageProps,  // createMessage parameters
  CreateMessageResult, // createMessage return data
} from '@kookapp/js-sdk'
```

Constant objects (use these instead of enums):

```typescript
import {
  KEventTypes,    // Event types: System, KMarkdown, Card, etc.
  KMessageKinds,  // WebSocket message kinds: Event, Hello, Ping, Pong, etc.
  KWSStates,      // Connection states: Idle, Connected, etc.
  ChannelTypes,   // Channel types
  KCardSizes,     // Card sizes: sm, lg
  KCardThemes,    // Card themes: primary, secondary, etc.
  RequestMethods, // HTTP methods: GET, POST, etc.
} from '@kookapp/js-sdk'
```

## Utilities

```typescript
import {
  createLogger,              // Create a logger instance
  extractContent,            // Extract plain text from KMarkdown event
  isExplicitlyMentioningBot, // Check if event @mentions the bot
  removingKMarkdownLabels,   // Remove KMarkdown labels from text
  parseDirective,            // Parse directive from event
  queryFromObject,           // Convert object to URL query string
  decompressKMessage,        // Decompress WebSocket message
  TaskQueue,                 // Async task queue with concurrency control
  PriorityQueue,             // Min-heap priority queue
  KMessageQueue,             // Message queue for event ordering
} from '@kookapp/js-sdk'
```

## Error Handling

The SDK follows a **no-throw** design. All functions return `null`, `undefined`, or a result object with `success: false` on failure instead of throwing exceptions. This ensures that runtime errors in the SDK never crash your application.

- `RestClient` methods return `KResponseExt<T>` with `success: false` on failure
- `decompressKMessage()` returns `null` on failure
- `CardBuilder.createSnapshot()` returns `null` on failure
- `CardBuilder.build()` returns `'[]'` on failure
- Event listeners and directive handlers are wrapped in try-catch internally

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.7.0 (for development)

## License

MIT
