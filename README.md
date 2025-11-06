# Miku - KOOK 机器人

<p>
  <img src="doc/kook-badge.png" height="28px" />
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

原本是一个 KOOK WebSocket 机器人的练习项目，如今已经可以满足日常使用需求~

## Usage

必须使用 pnpm，因为项目使用了先进的 `package.yaml` 管理依赖，yarn 和 npm 都不支持。

### 安装

```bash
pnpm install
pnpm approve-builds # 在交互式界面中选中 sqlite3
```

## 功能

- 群聊模式
- 多种 LLM 动态切换、继承上下文
- 遵循 OpenAI 标准的 Function Calling
- 遵循 OpenAI 标准的 Vision API
- Stable Diffusion API
- 指令支持
- 插件 API
- Yuki 系列 API
  - 测试工具
  - 动态指令定义
  - 更多
- 能够处理 KOOK WebSocket 消息乱序
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
- WebSocket 那部分状态机可以做成库

---
