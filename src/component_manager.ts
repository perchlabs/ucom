import type {
  Plugin,

  RawComponentConstructor,
  WebComponent,
  ModuleExports,
  ComponentParams,
  ComponentIdentity,
  WebComponentConstructor,
  PluginManager,
  ComponentManager,
  ComponentDef,

  PluginCallbackBuilderParams,
  AttributeChangedCallback,
  // FormAssociatedCallback,
  // FormDisabledCallback,
  // FormStateRestoreCallback,

} from './reference.ts'
import {
  FILE_POSTFIX,
  DIR_POSTFIX,

  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  // FORM_ASSOCIATED,
  // FORM_DISABLED,
  // FORM_RESET,
  // FORM_STATE_RESTORE,
  STATIC_FORM_ASSOCIATED,
  STATIC_OBSERVED_ATTRIBUTES,
} from './reference.ts'
import {
  ArrayFrom,
  createElement,
  cloneTemplateContent,
  getTopLevelChildren,
  reComponentPath,
  hashContent,
} from './common.ts'
import { getDirectives } from './directive.ts'
import plugMan from './plugin_manager.ts'

const AUTO_NAME_PREFIX = 'ucom'

export default (pluginsRaw: Plugin[]) => {
  const plugins = plugMan(pluginsRaw)

  const idents: Record<string, Promise<ComponentDef>> = {}
  const lazy: Record<string, ComponentIdentity> = {}

  const defineActual = (name: string, path: string, tpl: HTMLTemplateElement) => {
    delete lazy?.[name]
    return defineComponent(man, plugins, {name, path, tpl})
  }

  const man: ComponentManager = {
    lazy,

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

    resolve(url: string): ComponentIdentity {
      const matches = reComponentPath.exec(url)
      if (!matches) {
        throw Error(`Resolve '${url}'`)
      }

      const [,name,,, postfix] = matches
      if (postfix === DIR_POSTFIX) {
        url += `/${name}${FILE_POSTFIX}`
      }

      return {
        name,
        path: import.meta.resolve(url),
      }
    },

    // Define a component by name.  If name is null then create a name based upon the hash of the template contents.
    async define(name: string | null, tpl: HTMLTemplateElement) {
      name = name ? name.toLowerCase() : `${AUTO_NAME_PREFIX}-${hashContent(tpl)}`
      return idents[name] ??= defineActual(name, '', tpl )
    },

    // Import a component.  Providing the optional template argument prevents a fetch operation.  This is useful
    // for inlining components on the server (with a plugin providing this functionality).  The URL is useful in
    // this case for allowing relative imports according to the public web path of the component.
    async get(url: string, tpl?: HTMLTemplateElement) {
      try {
        const {name, path} = man.resolve(url)
        tpl ??= await fetchTemplate(path)
        return idents[name] ??= defineActual(name, path, tpl)
      } catch (e) {
        console.error(e)
      }
    },
  }

  return man
}

const fetchTemplate = async (path: string): Promise<HTMLTemplateElement> => {
  const res = await fetch(path)
  if (!res.ok) {
    throwFetchError(path, `Status ${res.status}`)
  }
  if (!res.headers.get('Content-Type')?.startsWith('text/html')) {
    throwFetchError(path, 'Content-Type is not text/html')
  }
  const text = await res.text()
  if (text.startsWith('<!DOCTYPE')) {
    throwFetchError(path, 'Content started with <!DOCTYPE')
  }

  const tpl = createElement('template')
  tpl.innerHTML = text

  return tpl
}

const throwFetchError = (path: string, reason: string) =>
  new Error(`Component '${path}', ${reason}`)

const defineComponent = async (man: ComponentManager, plugins: PluginManager, def: ComponentDef) => {
  const {name, tpl} = def

  // Copy the fragment so that the original version will be available for printing.
  const frag = cloneTemplateContent(tpl)

  await plugins.parse({man, def, frag})

  const [Raw, exports, params] = await processFragment(frag)

  const modes: Record<string, string | null> = {}
  for (const dir of ArrayFrom(params)) {
    const {op, camel, exp} = dir

    if (op === '+' && camel) {
      params.delete(dir)
      modes[camel] = exp
    }
  }

  const Com = createComponentConstructor(
    man,
    plugins,
    def,
    Raw,
    frag,
    {
      mode: modes?.mode as ShadowRootMode ?? 'closed',
      slotAssignment: modes?.slotAssignment as SlotAssignmentMode ?? undefined,
      delegatesFocus: 'delegatesFocus' in modes,
    },
    {
      internals: 'internals' in modes,
    },
  )

  await plugins.define({man, Com, Raw, frag, exports, params})
  customElements.define(name, Com, {
    extends: modes?.extends ?? undefined,
  })

  return def
}

const processFragment = async (frag: DocumentFragment): Promise<ParsedFragment> => {
  const script = frag.querySelector('script')
  script?.remove()

  const blobURL = URL.createObjectURL(
    new Blob([script?.text ?? ''], {type: 'text/javascript'})
  )
  const module = await import(
    /* @vite-ignore */
    blobURL
  )
  URL.revokeObjectURL(blobURL)

  const {
    default: Raw = class extends HTMLElement implements WebComponent {},
    ...exports
  } = module as {default: RawComponentConstructor} & ModuleExports

  const paramArr = getTopLevelChildren<HTMLParamElement>(frag, 'param')
    .flatMap(el => {
      el.remove()
      return getDirectives(el)
    })

  return [Raw, exports, new Set(paramArr)]
}

const createComponentConstructor = (
  man: ComponentManager,
  plugins: PluginManager,
  def: ComponentDef,
  Raw: RawComponentConstructor,
  frag: DocumentFragment,
  shadowRootOpts: ShadowRootInit,
  webComponentOpts: WebComponentOpts,
): WebComponentConstructor => {
  const Com = class extends Raw implements WebComponent {
    static [STATIC_FORM_ASSOCIATED] = Raw[STATIC_FORM_ASSOCIATED] ?? false
    static [STATIC_OBSERVED_ATTRIBUTES] = [...(Raw[STATIC_OBSERVED_ATTRIBUTES] ?? [])]

    static def = def

    _root = this.attachShadow(shadowRootOpts)
    _internals = webComponentOpts.internals ? this.attachInternals() : undefined

    constructor() {
      super()

      this._root.append(frag.cloneNode(true))
      plugins.construct({
        man,
        Com,
        Raw,
        el: this,
        root: this._root,
      })
    }

    async [ATTRIBUTE_CHANGED](...params: Parameters<AttributeChangedCallback>) {
      plugins[ATTRIBUTE_CHANGED](this.#params, params)
      await super[ATTRIBUTE_CHANGED]?.(...params)
    }

    async [CONNECTED]() {
      plugins[CONNECTED](this.#params)
      await super[CONNECTED]?.()
    }

    async [DISCONNECTED]() {
      plugins[DISCONNECTED](this.#params)
      await super[DISCONNECTED]?.()
    }

    // async [FORM_ASSOCIATED](...params: Parameters<FormAssociatedCallback>) {
    //   plugins[FORM_ASSOCIATED](this.#params, params)
    //   await super[FORM_ASSOCIATED]?.(...params)
    // }

    // async [FORM_DISABLED](...params: Parameters<FormDisabledCallback>) {
    //   plugins[FORM_DISABLED](this.#params, params)
    //   await super[FORM_DISABLED]?.(...params)
    // }

    // async [FORM_RESET]() {
    //   plugins[FORM_RESET](this.#params)
    //   await super[FORM_RESET]?.()
    // }

    // async [FORM_STATE_RESTORE](...params: Parameters<FormStateRestoreCallback>) {
    //   plugins[FORM_STATE_RESTORE](this.#params, params)
    //   await super[FORM_STATE_RESTORE]?.(...params)
    // }

    get #params(): PluginCallbackBuilderParams {
      return {
        Com,
        Raw,
        man,
        el: this,
        root: this._root,
      }
    }
  }
  return Com
}

type ParsedFragment = [
  Raw: RawComponentConstructor,
  exports: ModuleExports,
  params: ComponentParams,
]

type WebComponentOpts = {
  internals: boolean | undefined,
}
