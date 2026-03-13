# Miku - KOOK 机器人

<p>
  <img src="doc/kook-badge.png" height="28px" />
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

原本是一个 KOOK WebSocket 机器人的练习项目，如今已经可以满足日常使用需求~

## KOOK WebSocket Bot 协议实现

如果你只想看 KOOK 机器人 ws 协议实现，请参考 `src\websocket\kwebsocket\kws-helper.ts`。

## Usage

~~必须使用 pnpm，因为项目使用了先进的 `package.yaml` 管理依赖，yarn 和 npm 都不支持。~~

~~不行不行，package.yaml 到处都不兼容~~

推荐使用 yarn 管理依赖。

### 安装

```bash
yarn
```

## 功能

- 群聊模式
- 动态切换 LLM、继承上下文
- OpenAI + Gemini API 兼容
- ~~Stable Diffusion API~~ 画的什么玩意儿，已经去掉了
- ~~抽奖和投票~~ 在一次重构之后因为太懒所以去掉了
- 指令支持
- 插件 API（还没兼容 MCP）
- Yuki 系列 API
  - 测试工具
  - 动态指令定义
  - 更多
- 能够处理 KOOK WebSocket 消息乱序
- 兼容 KOOK 卡片消息及消息长度限制
- 兼容 KOOK 访问速率限制
- 兼容 KOOK WebSocket Bot 重连机制

## 示例：简单任务

![Demo](doc/demo1.jpg)

![Demo](doc/demo4.jpg)

![Demo](doc/demo5.jpg)

## 示例：视觉能力

![Demo](doc/demo10.png)

## 示例：看看天气

![Demo](doc/demo6.jpg)

## 示例：画点东西

![Demo](doc/demo8.png)

## 示例：做做运维

![Demo](doc/demo7.jpg)

## 示例：群聊模式

![Demo](doc/demo2.png)

![Demo](doc/demo9.png)

## 示例：指令系统

![Demo](doc/demo3.jpg)

## TODO List

- 测试覆盖
- MCP
- WebSocket 那部分状态机可以做成库

---
