import type {
  PluginConstructor,
} from './types.ts'
import comMan from './comman.ts'

export default (pluginClasses: PluginConstructor[] = []) => {
  const man = comMan(pluginClasses)

  let hasStarted = false
  const checkStarted = () => {
    if (!hasStarted) { throw Error('start before defining') }
  }

  return {
    async start() {
      if (hasStarted) {
        throw Error('Cannot start twice')
      }
      hasStarted = true

      if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve))
      }
      await man.start()
    },
    resolve: man.resolve,
    async define(...params: [name: string | null, tpl: HTMLTemplateElement]) {
      checkStarted()
      return man.define(...params)
    },
    async import(...params: [url: string, tpl?: HTMLTemplateElement]) {
      checkStarted()
      return man.import(...params)
    },
  }
}
