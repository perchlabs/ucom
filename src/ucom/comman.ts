import type {
  ComponentDef,
  ComponentManager,
  PluginManager,
  ComponentIdentity,
} from './types.ts'
import {
  resolveImport,
  fetchTemplate,
  ComponentFetchError,
  defineComponent,
  hashContent,
} from './component.ts'

const AUTO_NAME_PREFIX = 'ucom'
const FILE_POSTFIX = '.html'
const DIR_POSTFIX = '.com'

export default (plugins: PluginManager) => {
  const idents: Record<string, Promise<Readonly<ComponentDef>>> = {}
  const lazy: Record<string, ComponentIdentity> = {}

  // Resolves a component URL.
  const resolve = (url: string) => resolveImport(url, FILE_POSTFIX, DIR_POSTFIX)

  const defineActual = async (ident: ComponentDef) => {
    delete lazy?.[ident.name]
    return defineComponent({man, plugins, ident})
  }

  const get = async ({name, tpl, resolved = ''}: {name: string, tpl?: HTMLTemplateElement, resolved?: string}) => {
    try {
      tpl ??= await fetchTemplate(resolved)
      idents[name] ??= defineActual({name, tpl, resolved})
      return idents[name]
    } catch (e) {
      if (e instanceof ComponentFetchError) {
        console.error(`Problem fetching component '${e.resolved}'. Hint: ${e.reason}.`)
      }
    }
  }

  const man: ComponentManager = {
    lazy,
    resolve,
    registered(name: string): boolean {
      name = name.toLowerCase()
      return name in idents || customElements.get(name) !== undefined
    },
    // Define a component by name.  If name is null then create a name based upon the hash of the template contents.
    async define(name: string | null, tpl: HTMLTemplateElement) {
      name = name ? name.toLowerCase() : `${AUTO_NAME_PREFIX}-${hashContent(tpl)}`
      return get({name, tpl})
    },
    // Import a component.  Providing the optional template argument prevents a fetch operation.  This is useful for
    // inlining components on the server (with a plugin providing this functionality).  The URL is useful in this
    // case for allowing relative imports according to the public web path of the component.
    async import(url: string, tpl?: HTMLTemplateElement) {
      const {name, resolved} = resolve(url)
      return get({name, resolved, tpl})
    },
  }

  return man
}
