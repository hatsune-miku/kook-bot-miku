# Miku - KOOK 机器人

<p>
  <img src="doc/kook-badge.png" height="28px" />
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

原本是一个 KOOK WebSocket 机器人的练习项目，如今已经可以满足日常使用需求~

Miku 机器人永远不会接入 OpenClaw，但如果你需要 OpenClaw，推荐 KOOK 官方 OpenClaw 频道实现：

- https://www.npmjs.com/package/@kookapp/openclaw-kook

## Usage

推荐使用 Bun 管理依赖与运行。

### 安装

```bash
bun install
```

### 运行

```bash
bun run build
bun run start
```

## 功能

- 群聊模式
- 动态切换 LLM、继承上下文
- ~~Stable Diffusion API~~ 画的什么玩意儿，已经去掉了
- 指令支持
- 插件 API（还没兼容 MCP）
- Yuki 系列 API
  - 测试工具、动态指令定义等

## 示例：简单任务

![Demo](doc/demo1.jpg)

![Demo](doc/demo4.jpg)

![Demo](doc/demo5.jpg)

## 示例：视觉能力

![Demo](doc/demo10.png)

## 示例：做做运维

![Demo](doc/demo7.jpg)

---
