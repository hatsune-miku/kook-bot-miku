import { YukiContext } from './context'
import { Invocation, parseDirectiveInvocation, takeAndVerifyParameters } from './utils'

import { CardBuilder, CardIcons } from '../../helpers/card-helper'
import { ConfigUtils } from '../../utils/config/config'
import { info, warn } from '../../utils/logging/logger'
import { IChatDirectivesManager } from '../types'

export interface BuiltinCommands {
  [key: string]: () => Promise<any>
}

export default class YukiCommandSession {
  private chatManager: IChatDirectivesManager
  private invocation: Invocation
  private context: YukiContext
  private builtinCommands: BuiltinCommands

  constructor(chatManager: IChatDirectivesManager, invocation: Invocation, context: YukiContext) {
    this.context = context
    this.chatManager = chatManager
    this.invocation = invocation
    this.builtinCommands = this.prepareBuiltinCommands()
  }

  prepareBuiltinCommands(): BuiltinCommands {
    return {
      define: this._handleDefine.bind(this),
      sleep: this._handleSleep.bind(this),
      script: this._handleScript.bind(this),
      help: this._handleHelp.bind(this),
      echo: this._handleEcho.bind(this),
    }
  }

  async interpretUserDefinedCommand() {
    const { directive, parameters } = this.invocation
    const scripts = await ConfigUtils.main.userDefinedScripts.findUserDefinedScripts({
      guildId: this.context.guildId,
      name: directive,
    })
    let commandBody = scripts[0]?.script
    if (!commandBody) {
      this.chatManager.respondCardMessageToUser({
        originalEvent: this.context.event.originalEvent,
        content: CardBuilder.fromTemplate()
          .addIconWithKMarkdownText(CardIcons.IconCry, '未找到该函数')
          .addPlainText('请确保你输入了一个正确的函数名')
          .build(),
      })
      return
    }

    // 替换参数
    for (let i = 0; i < parameters.length; ++i) {
      info('Replacing parameter', i, `\\$arg${i}\\$`, parameters[i])
      const pattern = `$arg${i}$`
      commandBody = commandBody.replace(pattern, parameters[i])
    }

    info('Interpreting user-defined command', commandBody)

    const invocation = parseDirectiveInvocation(commandBody)
    if (!invocation) {
      this.chatManager.respondCardMessageToUser({
        originalEvent: this.context.event.originalEvent,
        content: CardBuilder.fromTemplate()
          .addIconWithKMarkdownText(CardIcons.IconCry, '执行函数失败了')
          .addPlainText('请确保你输入了一个合法的函数体')
          .build(),
      })
      return
    }

    const subSession = new YukiCommandSession(this.chatManager, invocation, this.context)
    await subSession.interpretInvocation()
  }

  async interpretInvocation() {
    // 替换常量
    const constantsMap = {
      currentGuildId: this.context.guildId,
      currentChannelId: this.context.channelId,
      authorId: this.context.author.id,
    }

    info('Interpreting invocation', this.invocation.parameters)

    this.invocation.parsedParameters = this.invocation.parameters.map((parameter) => {
      for (const [key, value] of Object.entries(constantsMap)) {
        const pattern = `$${key}$`
        parameter = parameter.replace(pattern, value)
      }
      return parameter
    })

    const awaitble = this.builtinCommands[this.invocation.directive]
    if (awaitble) {
      return await awaitble()
    }

    const didIntercept = this.chatManager.dispatchDirectives({
      ...this.context.event,
      directive: this.invocation.directive,
      parameter: this.invocation.parameters.join(' '),
    })
    if (didIntercept) {
      return
    }

    return await this.interpretUserDefinedCommand()
  }

  async _handleHelp() {
    this.chatManager.respondCardMessageToUser({
      originalEvent: this.context.event.originalEvent,
      content: CardBuilder.fromTemplate()
        .addIconWithKMarkdownText(CardIcons.IconCute, '指令说明~')
        .addPlainText('/yuki 系列指令是用来执行一些自动化操作的。')
        .addIconWithKMarkdownText(CardIcons.IconHappy, '/yuki /define [函数名] [函数体]')
        .addKMarkdownText('定义一个函数，函数体是另一个指令，例如 `/yuki /define /query_me /query $authorId$`。')
        .addIconWithKMarkdownText(CardIcons.IconHappy, '/yuki /sleep [毫秒数]')
        .addKMarkdownText('等待，例如 `/yuki /sleep 1000`。')
        .addIconWithKMarkdownText(CardIcons.IconHappy, '/yuki /script ["指令1", "指令2", ...]')
        .addKMarkdownText('顺序执行若干指令，例如 `/yuki /script ["/sleep 1000", "/query_me"]`。')
        .build(),
    })
    this.chatManager.respondCardMessageToUser({
      originalEvent: this.context.event.originalEvent,
      content: CardBuilder.fromTemplate()
        .addIconWithKMarkdownText(CardIcons.IconCute, '可用的宏~')
        .addPlainText('$currentGuildId$: 当前服务器 ID')
        .addPlainText('$currentChannelId$: 当前频道 ID')
        .addPlainText('$authorId$: 当前用户 ID')
        .build(),
    })
  }

  private async _handleSleep() {
    let sleepTimeMillis = 0
    try {
      sleepTimeMillis = parseInt(takeAndVerifyParameters(this.invocation, 1)[0])
    } catch {
      this.chatManager.respondCardMessageToUser({
        originalEvent: this.context.event.originalEvent,
        content: CardBuilder.fromTemplate()
          .addIconWithKMarkdownText(CardIcons.IconCry, '延时指令出错了')
          .addPlainText('请确保你输入了一个合法的数字')
          .build(),
      })
      return
    }
    return await new Promise((resolve) => setTimeout(resolve, sleepTimeMillis))
  }

  private async _handleScript() {
    let commandsSerialized = this.invocation.parsedParameters?.join(' ')
    if (!commandsSerialized) {
      this.chatManager.respondCardMessageToUser({
        originalEvent: this.context.event.originalEvent,
        content: CardBuilder.fromTemplate()
          .addIconWithKMarkdownText(CardIcons.IconCry, '执行脚本失败了')
          .addPlainText('请确保你输入了一个合法脚本')
          .build(),
      })
      return
    }
    commandsSerialized = commandsSerialized.replace(/\\\\"/g, '\\"')

    info('Executing script', commandsSerialized)
    console.log(commandsSerialized)
    let rawCommands = []
    try {
      rawCommands = JSON.parse(commandsSerialized)
    } catch (e) {
      warn('Failed to parse script', commandsSerialized, e)
      this.chatManager.respondCardMessageToUser({
        originalEvent: this.context.event.originalEvent,
        content: CardBuilder.fromTemplate()
          .addIconWithKMarkdownText(CardIcons.IconCry, '执行脚本失败了')
          .addPlainText('解析脚本失败')
          .build(),
      })
      return
    }

    for (const command of rawCommands) {
      const invocation = parseDirectiveInvocation(command)
      if (!invocation) {
        warn('Failed to parse command', command)
        continue
      }
      const subSession = new YukiCommandSession(this.chatManager, invocation, this.context)
      await subSession.interpretInvocation()
    }
  }

  private async _handleEcho() {
    const messages = takeAndVerifyParameters(this.invocation, 1)
    if (messages.length > 0) {
      this.chatManager.respondToUser({
        originalEvent: this.context.event.originalEvent,
        content: messages.join(' '),
      })
    }
  }

  private async _handleDefine() {
    const { guildId } = this.context
    const [commandName, commandBody] = takeAndVerifyParameters(this.invocation, 1, { fillInTemplate: false })

    if (!commandName || !commandBody) {
      this.chatManager.respondCardMessageToUser({
        originalEvent: this.context.event.originalEvent,
        content: CardBuilder.fromTemplate()
          .addIconWithKMarkdownText(CardIcons.IconCry, '定义函数失败了')
          .addPlainText('请确保你输入了函数名和函数体')
          .build(),
      })
      return
    }

    if (commandName.includes(' ')) {
      this.chatManager.respondCardMessageToUser({
        originalEvent: this.context.event.originalEvent,
        content: CardBuilder.fromTemplate()
          .addIconWithKMarkdownText(CardIcons.IconCry, '定义函数失败了')
          .addPlainText('函数名不能包含空格')
          .build(),
      })
      return
    }

    ConfigUtils.main.userDefinedScripts.createUserDefinedScript({
      guildId,
      userId: this.context.author.id,
      name: commandName,
      script: commandBody,
    })

    this.chatManager.respondCardMessageToUser({
      originalEvent: this.context.event.originalEvent,
      content: CardBuilder.fromTemplate()
        .addIconWithKMarkdownText(CardIcons.IconCute, '已定义函数')
        .addPlainText(`快试试 @我 /yuki /${commandName} 吧`)
        .build(),
    })
  }
}
