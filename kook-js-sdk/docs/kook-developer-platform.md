# KOOK 开发者平台文档参考

> 本文档整理自 KOOK 开发者平台 (https://developer.kookapp.cn/doc/)，供 SDK 开发参考。

---

## 1. WebSocket 信令协议

### 1.1 连接流程

1. 通过 `GET /api/v3/gateway/index` 获取 WebSocket 网关地址
2. 使用获取到的 `url` 建立 WebSocket 连接
3. 连接成功后，服务端发送 `hello` 包（信令类型 1），包含 `session_id`
4. 客户端定时发送 `ping` 包（信令类型 2），服务端回复 `pong`（信令类型 3）

### 1.2 信令格式

```typescript
interface KMessage<T> {
  s: number    // 信令类型 (0-6)
  d: T         // 数据字段
  sn?: number  // 序列号，仅在 s=0 时有
}
```

### 1.3 信令类型

| 类型 | 名称 | 方向 | 说明 |
|------|------|------|------|
| 0 | Event | server→client | 服务端推送消息事件 |
| 1 | Hello | server→client | 握手结果，连接成功返回 `session_id` |
| 2 | Ping | client→server | 心跳请求，包含最后收到的 `sn` |
| 3 | Pong | server→client | 心跳响应 |
| 4 | Resume | client→server | 断线恢复请求 |
| 5 | Reconnect | server→client | 服务端要求客户端重新连接（需重置所有状态） |
| 6 | ResumeAck | server→client | 恢复确认，包含新的 `session_id` |

### 1.4 心跳与断线恢复生命周期

1. **心跳**：连接建立后每 30 秒发送一次 Ping（包含当前 `sn`）
2. **超时处理**：6 秒内未收到 Pong → 重发 Ping（2s 和 4s 延迟各一次）
3. **Resume**：Ping 重试仍失败 → 发送 Resume 请求（8s 和 16s 延迟各一次）
4. **Resume 超时**：6 秒内未收到 ResumeAck → 进入无限重试模式
5. **无限重试**：指数退避（1s → 2s → 4s → ... → 60s 封顶），获取新 Gateway URL 重新连接
6. **Reconnect 包**：任何时候收到服务端的 Reconnect 信令，必须清空所有状态（sn、session_id、消息队列），从头开始连接

### 1.5 消息序列号 (SN)

- 每个 Event 消息（s=0）带有递增的 `sn`
- 客户端需跟踪 `lastSn`，确保消息按序处理
- 跳号时将消息入队，等待缺失的 SN 到达后批量处理
- 6 秒后仍有缺口，强制清空队列处理

### 1.6 压缩

- Gateway 请求中 `compress=1` 时启用压缩
- 使用 DEFLATE 算法（zlib），通过 pako 库解压
- 解压后为 JSON 字符串

---

## 2. 事件类型

### 2.1 消息类型 (KEventType)

| 值 | 类型 | 说明 |
|----|------|------|
| 1 | Text | 纯文本消息 |
| 2 | Image | 图片消息（content 为 URL） |
| 3 | Video | 视频消息（content 为 URL） |
| 4 | File | 文件消息（content 为 URL） |
| 8 | Audio | 音频消息 |
| 9 | KMarkdown | KMarkdown 格式消息 |
| 10 | Card | 卡片消息 |
| 255 | System | 系统事件 |

### 2.2 事件结构

```typescript
interface KEvent<KExtraType> {
  channel_type: 'GROUP' | 'PERSON' | 'BROADCAST'
  type: number          // KEventType
  target_id: string     // 频道消息=channel_id，系统事件=guild_id
  author_id: string     // 发送者 ID，1=系统
  content: string       // 消息内容或 URL
  msg_id: string        // 消息 ID
  msg_timestamp: number // 毫秒时间戳
  nonce: string         // 客户端 nonce 回声
  extra: KExtraType     // 扩展数据
}
```

### 2.3 文字频道扩展

```typescript
interface KTextChannelExtra {
  type: number            // KEventType
  guild_id: string
  channel_name: string
  mention: string[]       // 被 @ 的用户 ID 列表
  mention_all: boolean
  mention_roles: number[] // 被 @ 的角色 ID 列表
  mention_here: boolean
  author: KUser
}
```

### 2.4 系统事件类型

常见系统事件 `extra.type`：

| type | 说明 |
|------|------|
| `deleted_message` | 消息被删除 |
| `updated_message` | 消息被更新 |
| `pinned_message` | 消息被置顶 |
| `unpinned_message` | 消息取消置顶 |
| `message_btn_click` | 卡片按钮被点击 |
| `added_reaction` | 添加了回应 |
| `deleted_reaction` | 删除了回应 |
| `updated_channel` | 频道信息更新 |
| `deleted_channel` | 频道被删除 |
| `added_channel` | 新增频道 |
| `joined_guild` | 用户加入服务器 |
| `exited_guild` | 用户离开服务器 |
| `updated_guild` | 服务器信息更新 |
| `deleted_guild` | 服务器被删除 |
| `self_joined_guild` | Bot 被添加到服务器 |
| `self_exited_guild` | Bot 被移出服务器 |
| `added_role` | 新增角色 |
| `deleted_role` | 删除角色 |
| `updated_role` | 角色更新 |
| `joined_channel` | 用户加入语音频道 |
| `exited_channel` | 用户退出语音频道 |
| `guild_member_online` | 成员上线 |
| `guild_member_offline` | 成员下线 |
| `updated_guild_member` | 成员信息更新 |
| `updated_private_message` | 私信更新 |
| `deleted_private_message` | 私信删除 |
| `private_added_reaction` | 私信回应 |
| `private_deleted_reaction` | 私信回应删除 |
| `user_updated` | 用户信息更新 |

---

## 3. REST API

### 3.1 通用信息

- **Base URL**: `https://www.kookapp.cn`
- **API 版本**: `/api/v3/`
- **认证**: `Authorization: Bot {TOKEN}` Header
- **Content-Type**: `application/json`（文件上传使用 `multipart/form-data`）

### 3.2 响应格式

```typescript
interface KResponse<T> {
  code: number     // 0 = 成功
  message: string
  data: T
}
```

### 3.3 Gateway API

#### 获取网关地址
- **GET** `/api/v3/gateway/index`
- **参数**: `compress` (0|1)
- **Resume 参数**: `resume=1`, `sn`, `session_id`
- **返回**: `{ url: string }`

### 3.4 Message API

#### 发送消息
- **POST** `/api/v3/message/create`
- **参数**:
  - `type`: 消息类型 (KEventType)
  - `target_id`: 目标频道 ID
  - `content`: 消息内容
  - `quote?`: 引用消息 ID
  - `nonce?`: 客户端 nonce
  - `temp_target_id?`: 临时消息目标用户 ID
  - `reply_msg_id?`: 回复消息 ID
- **返回**: `{ msg_id, msg_timestamp, nonce }`

#### 更新消息
- **POST** `/api/v3/message/update`
- **参数**: `msg_id`, `content`, `quote?`, `temp_target_id?`
- **返回**: `{}`

#### 删除消息
- **POST** `/api/v3/message/delete`
- **参数**: `msg_id`
- **返回**: `{}`

#### 获取消息列表
- **GET** `/api/v3/message/list`
- **参数**: `target_id`, `msg_id?`, `pin?`, `flag?`, `page_size?`

#### 获取消息详情
- **GET** `/api/v3/message/view`
- **参数**: `msg_id`

#### 添加回应
- **POST** `/api/v3/message/add-reaction`
- **参数**: `msg_id`, `emoji`
- **返回**: `[]`

#### 删除回应
- **POST** `/api/v3/message/delete-reaction`
- **参数**: `msg_id`, `emoji`, `user_id?`

### 3.5 Asset API

#### 上传文件
- **POST** `/api/v3/asset/create`
- **Content-Type**: `multipart/form-data`
- **参数**: `file` (文件数据)
- **返回**: `{ url: string }`

### 3.6 User API

#### 获取当前用户
- **GET** `/api/v3/user/me`
- **返回**: Bot 自身信息

#### 获取用户详情
- **GET** `/api/v3/user/view`
- **参数**: `user_id`, `guild_id?`
- **返回**: 用户详细信息（含 roles, joined_at, active_time）

### 3.7 Guild (服务器) API

#### 获取服务器列表
- **GET** `/api/v3/guild/list`
- **参数**: `page?`, `page_size?`, `sort?`

#### 获取服务器详情
- **GET** `/api/v3/guild/view`
- **参数**: `guild_id`

#### 获取成员列表
- **GET** `/api/v3/guild/user-list`
- **参数**: `guild_id`, `channel_id?`, `search?`, `role_id?`, `mobile_verified?`, `active_time?`, `joined_at?`, `page?`, `page_size?`, `filter_user_id?`

#### 设置用户昵称
- **POST** `/api/v3/guild/nickname`
- **参数**: `guild_id`, `nickname?`, `user_id?`

#### 离开服务器
- **POST** `/api/v3/guild/leave`
- **参数**: `guild_id`

#### 踢出用户
- **POST** `/api/v3/guild/kickout`
- **参数**: `guild_id`, `target_id`

### 3.8 Channel (频道) API

#### 获取频道列表
- **GET** `/api/v3/channel/list`
- **参数**: `guild_id`, `type?`, `page?`, `page_size?`

#### 获取频道详情
- **GET** `/api/v3/channel/view`
- **参数**: `target_id`

#### 创建频道
- **POST** `/api/v3/channel/create`
- **参数**: `guild_id`, `name`, `type?`, `parent_id?`, `limit_amount?`, `voice_quality?`

#### 删除频道
- **POST** `/api/v3/channel/delete`
- **参数**: `channel_id`

#### 移动用户（语音）
- **POST** `/api/v3/channel/move-user`
- **参数**: `target_id`, `user_ids[]`

### 3.9 Guild Role (角色) API

#### 获取角色列表
- **GET** `/api/v3/guild-role/list`
- **参数**: `guild_id`, `page?`, `page_size?`

#### 创建角色
- **POST** `/api/v3/guild-role/create`
- **参数**: `guild_id`, `name?`

#### 更新角色
- **POST** `/api/v3/guild-role/update`
- **参数**: `role_id`, `name?`, `color?`, `hoist?`, `mentionable?`, `permissions?`

#### 删除角色
- **POST** `/api/v3/guild-role/delete`
- **参数**: `guild_id`, `role_id`

#### 授予/撤销角色
- **POST** `/api/v3/guild-role/grant`
- **POST** `/api/v3/guild-role/revoke`
- **参数**: `guild_id`, `user_id`, `role_id`

### 3.10 Direct Message (私信) API

#### 获取私信列表
- **GET** `/api/v3/direct-message/list`
- **参数**: `chat_code?`, `target_id?`, `msg_id?`, `flag?`, `page_size?`

#### 发送私信
- **POST** `/api/v3/direct-message/create`
- **参数**: `target_id?`, `chat_code?`, `type`, `content`, `quote?`, `nonce?`

#### 更新私信
- **POST** `/api/v3/direct-message/update`
- **参数**: `msg_id`, `content`, `quote?`

#### 删除私信
- **POST** `/api/v3/direct-message/delete`
- **参数**: `msg_id`

#### 添加/删除私信回应
- **POST** `/api/v3/direct-message/add-reaction`
- **POST** `/api/v3/direct-message/delete-reaction`
- **参数**: `msg_id`, `emoji`

### 3.11 User Chat (用户聊天会话) API

#### 获取聊天会话列表
- **GET** `/api/v3/user-chat/list`
- **参数**: `page?`, `page_size?`

#### 获取聊天会话详情
- **GET** `/api/v3/user-chat/view`
- **参数**: `chat_code`

#### 创建聊天会话
- **POST** `/api/v3/user-chat/create`
- **参数**: `target_id`

#### 删除聊天会话
- **POST** `/api/v3/user-chat/delete`
- **参数**: `chat_code`

---

## 4. 限速 Header

每个 API 响应包含限速信息：

| Header | 说明 |
|--------|------|
| `X-Rate-Limit-Limit` | 时间窗口内最大请求数 |
| `X-Rate-Limit-Remaining` | 剩余请求数 |
| `X-Rate-Limit-Reset` | 配额恢复的 Unix 时间戳（秒） |
| `X-Rate-Limit-Bucket` | 限速桶标识 |
| `X-Rate-Limit-Global` | 是否触发全局限速 |

---

## 5. 卡片消息格式

### 5.1 卡片结构

```json
[{
  "type": "card",
  "theme": "secondary",
  "size": "lg",
  "color": "#fb7299",
  "modules": [...]
}]
```

### 5.2 Theme

`primary` | `secondary` | `warning` | `danger` | `info` | `invisible` | `none`

### 5.3 模块类型

#### section - 文本段落
```json
{
  "type": "section",
  "text": { "type": "kmarkdown", "content": "文本内容" },
  "mode": "left",
  "accessory": { "type": "image", "src": "url", "size": "sm" }
}
```

#### container - 图片容器
```json
{
  "type": "container",
  "elements": [{ "type": "image", "src": "url" }]
}
```

#### image-group - 多图组
```json
{
  "type": "image-group",
  "elements": [{ "type": "image", "src": "url" }]
}
```

#### header - 标题
```json
{
  "type": "header",
  "text": { "type": "plain-text", "content": "标题文本" }
}
```

#### divider - 分割线
```json
{ "type": "divider" }
```

#### action-group - 按钮组
```json
{
  "type": "action-group",
  "elements": [{
    "type": "button",
    "theme": "primary",
    "value": "click_value",
    "text": { "type": "plain-text", "content": "按钮文本" }
  }]
}
```

#### context - 上下文
```json
{
  "type": "context",
  "elements": [
    { "type": "plain-text", "content": "上下文文本" },
    { "type": "kmarkdown", "content": "KMarkdown 文本" },
    { "type": "image", "src": "url" }
  ]
}
```

#### file / audio / video - 文件
```json
{
  "type": "file",
  "title": "文件名",
  "src": "url",
  "size": "文件大小（字节字符串）"
}
```

#### countdown - 倒计时
```json
{
  "type": "countdown",
  "mode": "day|hour|second",
  "endTime": 1609459200000
}
```

#### invite - 邀请
```json
{
  "type": "invite",
  "code": "邀请码"
}
```

---

## 6. KMarkdown 语法

| 语法 | 效果 |
|------|------|
| `**文本**` | **粗体** |
| `*文本*` | *斜体* |
| `~~文本~~` | ~~删除线~~ |
| `` `代码` `` | 行内代码 |
| ` ```代码块``` ` | 代码块 |
| `[文本](链接)` | 超链接 |
| `(met)用户ID(met)` | @用户 |
| `(met)all(met)` | @全体成员 |
| `(met)here(met)` | @在线成员 |
| `(rol)角色ID(rol)` | @角色 |
| `(chn)频道ID(chn)` | #频道 |
| `(emj)表情名(emj)[表情ID]` | 自定义表情 |
| `:emoji:` | 服务器表情 |
| `> 引用` | 引用文本 |
| `---` | 分割线 |
| `(spl)文本(spl)` | 剧透文本 |
| `(ins)文本(ins)` | 下划线 |
| `(font)文本(font)[颜色][大小][主题]` | 自定义字体样式 |

---

## 7. 用户对象

```typescript
interface KUser {
  id: string
  username: string
  nickname: string
  identify_num: string
  online: boolean
  bot: boolean
  status: number        // 0/1=正常, 10=封禁
  avatar: string
  vip_avatar: string
  is_vip: boolean
  is_sys: boolean
  mobile_verified: boolean
  roles: number[]
}
```

---

## 8. 分页

列表接口通常支持分页：

```typescript
interface PaginatedResponse<T> {
  items: T[]
  meta: {
    page: number
    page_total: number
    page_size: number
    total: number
  }
  sort: Record<string, number>
}
```
