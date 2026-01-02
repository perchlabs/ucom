import type {
  ComponentManager,
  ComponentIdentity,
  PluginConstructor,
} from './types.ts'
import {
  isValidComponentName as isName,
  isValidComponentPath as isPath,
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

export default (pluginClasses: PluginConstructor[]) => {
  const plugins = plugMan(pluginClasses)

  const idents: Record<string, ReturnType<typeof defineComponent>> = {}
  const lazy: Record<string, ComponentIdentity> = {}

  const defineActual = (name: string, resolved: string, tpl: HTMLTemplateElement) => {
    delete lazy?.[name]
    return defineComponent(man, plugins, {name, resolved, tpl})
  }

  const man: ComponentManager = {
    lazy,
    resolve,
    isName,
    isPath,

    async start() {
      if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve))
      }
      plugins.start({man})
    },

    registered(name: string): boolean {
      name = name.toLowerCase()
      return name in idents || customElements.get(name) !== undefined
    },

    // Define a component by name.  If name is null then create a name based upon the hash of the template contents.
    async define(name: string | null, tpl: HTMLTemplateElement) {
      name = name ? name.toLowerCase() : `${AUTO_NAME_PREFIX}-${hashContent(tpl)}`
      idents[name] ??= defineActual(name, '', tpl )
      return idents[name]
    },

    // Import a component.  Providing the optional template argument prevents a fetch operation.  This is useful
    // for inlining components on the server (with a plugin providing this functionality).  The URL is useful in
    // this case for allowing relative imports according to the public web path of the component.
    async import(url: string, tpl?: HTMLTemplateElement) {
      const {name, resolved} = resolve(url)
      try {
        tpl ??= await fetchTemplate(resolved)
        return idents[name] ??= defineActual(name, resolved, tpl)
      } catch (e) {
        if (e instanceof ComponentFetchError) {
          console.error(`Problem fetching component '${e.resolved}'. Hint: ${e.reason}.`)
        }
      }
    },
  }

  return man
}
