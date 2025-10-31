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

const AUTO_NAME_PREFIX = 'u-auto'
const FILE_POSTFIX = '.html'
const DIR_POSTFIX = '.com'

export default class ComMan implements ComponentManager {
  #idents: Record<string, Promise<Readonly<ComponentDef>>> = {}
  #plugins: PluginManager

  lazy: {[key: string]: ComponentIdentity} = {}

  constructor(plugins: PluginManager) {
    this.#plugins = plugins
  }

  registered(name: string): boolean {
    name = name.toLowerCase()
    return name in this.#idents || customElements.get(name) !== undefined
  }

  // Resolves a component URL.
  resolve(url: string) {
    return resolveImport(url, FILE_POSTFIX, DIR_POSTFIX)
  }

  // Define a component by name.  If name is null then create a name based upon the hash of the template contents.
  async define(name: string | null, tpl: HTMLTemplateElement) {
    name = name ? name.toLowerCase() : `${AUTO_NAME_PREFIX}-${hashContent(tpl)}`
    return this.#get({name, tpl})
  }

  // Import a component.  Providing the optional template argument prevents a fetch operation.  This is useful for
  // inlining components on the server (with a plugin providing this functionality).  The URL is useful in this
  // case for allowing relative imports according to the public web path of the component.
  async import(url: string, tpl?: HTMLTemplateElement) {
    const {name, resolved} = this.resolve(url)
    return this.#get({name, resolved, tpl})
  }

  async #get({name, tpl, resolved = ''}: {name: string, tpl?: HTMLTemplateElement, resolved?: string}) {
    try {
      tpl ??= await fetchTemplate(resolved)
      this.#idents[name] ??= this.#define({name, tpl, resolved})
      return this.#idents[name]
    } catch (e) {
      if (e instanceof ComponentFetchError) {
        console.error(`Problem fetching component '${e.resolved}'. Hint: ${e.reason}.`)
      }
    }
  }

  async #define({name, tpl, resolved = ''}: {name: string, tpl: HTMLTemplateElement, resolved?: string}) {
    if (name in this.lazy) {
      delete this.lazy[name]
    }
    
    return defineComponent({
      man: this,
      plugins: this.#plugins,
      ident: {name, resolved, tpl},
    })
  }
}
