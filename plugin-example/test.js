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
