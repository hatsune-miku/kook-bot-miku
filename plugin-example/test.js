/** @type {import('../src/plugins/types').IKbmPlugin} */
class Plugin {
  kbmPlugin = true
  name = 'test'
  description = 'test plugin'

  /** @returns {import('../src/chat/directives/types').ChatDirectiveItem[]} */
  get providedDirectives() {
    return [
      {
        triggerWord: 'test',
        parameterDescription: 'test parameter',
        description: 'test directive',
        defaultValue: undefined,
        permissionGroups: ['everyone'],
        handler: this.handleTestDirective.bind(this),
      },
    ]
  }

  /** @returns {import('../src/chat/functional/tool-functions/dispatch').IFunctionTool[]} */
  get providedTools() {
    return [
      {
        /**
         * @returns {Promise<import('openai/resources').ChatCompletionTool>}
         */
        async defineOpenAICompletionTool() {
          return {
            type: 'function',
            function: {
              name: 'testTool',
              description: '用于测试',
              parameters: {
                type: 'object',
                properties: {
                  a: {
                    type: 'number',
                    description: '一个数字',
                  },
                  b: {
                    type: 'number',
                    description: '另一个数字',
                  },
                },
                required: ['a', 'b'],
                additionalProperties: false,
              },
              strict: false,
            },
          }
        },

        /**
         * @param {import('../src/chat/functional/types').ToolFunctionContext} context
         * @param {any} params
         * @returns {Promise<string>}
         */
        async invoke(context, params) {
          const { a, b } = params
          return `${a},${b},${a + b}`
        },
      },
    ]
  }

  /** @param {import('../src/plugins/types').IKbmPluginContext} context */
  async onLoad(context) {
    this.context = context
  }

  /**
   * @param {import('../src/chat/directives/types').ParseEventResultValid} event
   * @param {import('../src/chat/directives/types').IChatDirectivesManager} manager
   */
  async handleTestDirective(event, manager) {
    const card = this.context.CardBuilder.fromTemplate().addPlainText('test response').build()
    manager.respondCardMessageToUser({
      originalEvent: event.originalEvent,
      content: card,
    })
  }
}

module.exports = Plugin
