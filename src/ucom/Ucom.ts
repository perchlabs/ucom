import type {
  PluginConstructor,
} from './types.ts'
import plugMan from './plugman.ts'
import comMan from './comman.ts'

export default (pluginClasses: PluginConstructor[] = []) => {
  let hasStarted = false
  const plugins = plugMan(pluginClasses)
  const man = comMan(plugins)

  return {
    async start() {
      if (hasStarted) {
        throw Error('Cannot start twice')
      }
      hasStarted = true

      const start = () => plugins.start({man})
      return (async () => {
        if (document.readyState === 'loading') {
          await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve)
          })
        }
        await start()
      })()
    },
    resolve(...params: [url: string]) {
      return man.resolve(...params)
    },
    async define(...params: [name: string | null, tpl: HTMLTemplateElement]) {
      if (!hasStarted) {
        throw Error('start before defining')
      }

      return man.define(...params)
    },
    async import(...params: [url: string, tpl?: HTMLTemplateElement]) {
      if (!hasStarted) {
        throw Error('start before defining')
      }

      return man.import(...params)
    },
  }
}
