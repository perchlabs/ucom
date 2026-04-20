import type {
  ComponentManager,
  ComponentIdentity,
  Plugin,
} from './types.ts'
import {
  isValidComponentName as isName,
} from './common.ts'
import {
  resolveImport as resolve,
  fetchTemplate,
  ComponentFetchError,
  defineComponent,
  hashContent,
} from './component.ts'
import plugMan from './plugman.ts'

const AUTO_NAME_PREFIX = 'ucom'

export default (pluginsRaw: Plugin[]) => {
  const plugins = plugMan(pluginsRaw)

  const idents: Record<string, ReturnType<typeof defineComponent>> = {}
  const lazy: Record<string, ComponentIdentity> = {}

  const defineActual = (name: string, path: string, tpl: HTMLTemplateElement) => {
    delete lazy?.[name]
    return defineComponent(man, plugins, {name, path, tpl})
  }

  const man: ComponentManager = {
    lazy,
    resolve,
    isName,

    async start() {
      if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve))
      }
      return plugins.start(man)
    },

    has(name: string): boolean {
      name = name.toLowerCase()
      return name in idents || !!customElements.get(name)
    },

    // Define a component by name.  If name is null then create a name based upon the hash of the template contents.
    async define(name: string | null, tpl: HTMLTemplateElement) {
      name = name ? name.toLowerCase() : `${AUTO_NAME_PREFIX}-${hashContent(tpl)}`
      return idents[name] ??= defineActual(name, '', tpl )
    },

    // Import a component.  Providing the optional template argument prevents a fetch operation.  This is useful
    // for inlining components on the server (with a plugin providing this functionality).  The URL is useful in
    // this case for allowing relative imports according to the public web path of the component.
    async import(url: string, tpl?: HTMLTemplateElement) {
      const {name, path} = resolve(url)
      try {
        tpl ??= await fetchTemplate(path)
        return idents[name] ??= defineActual(name, path, tpl)
      } catch (e) {
        if (e instanceof ComponentFetchError) {
          console.error(`Fetching component '${e.resolved}', ${e.reason}`)
        }
      }
    },
  }

  return man
}
