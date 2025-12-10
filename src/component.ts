import type {
  RawComponentConstructor,
  WebComponent,
  ModuleExports,
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
} from './types.ts'
import {
  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  // FORM_ASSOCIATED,
  // FORM_DISABLED,
  // FORM_RESET,
  // FORM_STATE_RESTORE,
  STATIC_FORM_ASSOCIATED,
  STATIC_OBSERVED_ATTRIBUTES,
  getTopLevelChildren,
} from './common.ts'

export function resolveImport(url: string, postfixFile: string, postfixDir: string): ComponentIdentity {
  const re = new RegExp(`.*?([a-z]+\-[a-z0-9]+)(${postfixFile}|${postfixDir})$`)
  const matches = re.exec(url)
  if (!matches) {
    throw Error(`Problem resolving '${url}'`)
  }

  const [,name, postfix] = matches
  if (postfix === postfixDir) {
    url += `/${name}${postfixFile}`
  }

  return {
    name,
    resolved: import.meta.resolve(url),
  }
}

export async function fetchTemplate(resolved: string): Promise<HTMLTemplateElement> {
  const res = await fetch(resolved)
  if (!res.ok) {
    throw new ComponentFetchError(resolved, `Status ${res.status}`)
  }
  if (!res.headers.get('Content-Type')?.startsWith('text/html')) {
    throw new ComponentFetchError(resolved, 'Content-Type is not text/html')
  }
  const text = await res.text()
  if (text.startsWith('<!DOCTYPE')) {
    throw new ComponentFetchError(resolved, 'Content started with <!DOCTYPE')
  }

  const tpl = document.createElement('template')
  tpl.innerHTML = text
  // Keep the prestine template so that plugins can reference it.
  Object.freeze(tpl)

  return tpl
}

export class ComponentFetchError extends Error {
  resolved: string
  reason: string

  constructor(resolved: string, reason: string = 'Unspecified') {
    super()

    this.resolved = resolved
    this.reason = reason
  }
}

export async function defineComponent(man: ComponentManager, plugins: PluginManager, def: ComponentDef) {
  const {name, tpl} = def

  // Copy the fragment so that the original version will be available for printing.
  const frag = tpl.content.cloneNode(true) as DocumentFragment
  if (frag.querySelector('template[shadowrootmode]')) {
    throw `Component '${name}' used template attribute 'shadowrootmode'. Declarative Shadow Dom (DSD) is not allowed.`
  }

  await plugins.parse({man, def, frag})

  const [Raw, exports, shadowRootOpts, customElementOpts, webComponentOpts] = await processFragment(frag)

  const Com = createComponentConstructor(
    man,
    plugins,
    def,
    Raw,
    frag,
    shadowRootOpts,
    webComponentOpts,
  )

  await plugins.define({man, Com, Raw, frag, exports})
  customElements.define(name, Com, customElementOpts)

  return def
}

async function processFragment(frag: DocumentFragment): Promise<ParsedScript> {
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

  const reMeta = /^\+([a-z]+)/
  const metaMap: Record<string, string> = {}
  const metaArr = getTopLevelChildren<HTMLMetaElement>(frag, 'META')
  metaArr.forEach(meta => {
    Array.from(meta.attributes).forEach(({name, value}) => {
      const match = name.match(reMeta)
      if (match) {
        metaMap[match[1]] = value
        meta.remove()
      }
    })
  })

  return [
    Raw,
    exports,
    {
      mode: metaMap?.mode as ShadowRootMode ?? 'closed',
      slotAssignment: metaMap?.slotAssignment as SlotAssignmentMode ?? undefined,
      delegatesFocus: 'delegatesFocus' in metaMap,
    },
    {
      extends: metaMap?.extends,
    },
    {
      internals: 'internals' in metaMap,
    },
  ]
}

export function hashContent(tpl: HTMLTemplateElement): string {
  const div = document.createElement('div')
  div.appendChild(tpl.content.cloneNode(true))
  return div.innerHTML
    .split('')
    .reduce((hash, char) => char.charCodeAt(0) + (hash << 6) + (hash << 16) - hash, 0)
    .toString()
}

function createComponentConstructor(
  man: ComponentManager,
  plugins: PluginManager,
  def: ComponentDef,
  Raw: RawComponentConstructor,
  frag: DocumentFragment,
  shadowRootOpts: ShadowRootInit,
  webComponentOpts: WebComponentOpts,
): WebComponentConstructor {
  const Com = class extends Raw implements WebComponent {
    static [STATIC_FORM_ASSOCIATED] = Raw[STATIC_FORM_ASSOCIATED] ?? false
    static [STATIC_OBSERVED_ATTRIBUTES] = [...(Raw[STATIC_OBSERVED_ATTRIBUTES] ?? [])]

    static get def() { return def }

    #shadow = this.attachShadow(shadowRootOpts)
    #internals = webComponentOpts.internals ? this.attachInternals() : undefined

    constructor() {
      super()

      this.#shadow.append(frag.cloneNode(true))
      plugins.construct({
        man,
        Com,
        Raw,
        el: this,
        shadow: this.#shadow,
      })
    }

    async [ATTRIBUTE_CHANGED](...params: Parameters<AttributeChangedCallback>) {
      plugins[ATTRIBUTE_CHANGED](this.#params, params)
      await super[ATTRIBUTE_CHANGED]?.(...params)
    }

    async [CONNECTED]() {
      plugins[CONNECTED](this.#params)
      await super[CONNECTED]?.({
        shadow: this.#shadow,
        internals: this.#internals,
      })
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
        el: this,
        shadow: this.#shadow,
      }
    }
  }
  return Com
}

type ParsedScript = [
  Raw: RawComponentConstructor,
  exports: ModuleExports,
  shadowRootOpts: ShadowRootInit,
  customElementOpts: ElementDefinitionOptions,
  webComponentOpts: WebComponentOpts,
]

type WebComponentOpts = {
  internals: boolean | undefined,
}
