import type {
  PluginConstructor,
} from './types.ts'
import PlugMan from './PlugMan.ts'
import ComMan from './ComMan.ts'

export default class Ucom {
  #hasStarted = false
  #plugins: PlugMan
  #man: ComMan

  constructor(pluginClasses: PluginConstructor[] = []) {
    this.#plugins = new PlugMan(pluginClasses)
    this.#man = new ComMan(this.#plugins)
  }

  async start() {
    if (this.#hasStarted) {
      throw Error('Cannot start twice')
    }
    this.#hasStarted = true

    const start = async () => {
      await this.#plugins.start({
        man: this.#man,
      })
    }

    const loaded = async () => {
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve)
        })
      }
      return start()
    }

    return loaded()
  }

  resolve(...params: [url: string]) {
    return this.#man.resolve(...params)
  }

  async define(...params: [name: string | null, tpl: HTMLTemplateElement]) {
    if (!this.#hasStarted) {
      throw Error('start before defining')
    }

    return this.#man.define(...params)
  }

  async import(...params: [url: string, tpl?: HTMLTemplateElement]) {
    if (!this.#hasStarted) {
      throw Error('start before defining')
    }

    return this.#man.import(...params)
  }
}
