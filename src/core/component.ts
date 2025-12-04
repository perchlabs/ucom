import type {
  RawComponentConstructor,
  WebComponent,
  ModuleExports,
  ComponentIdentity,
  WebComponentConstructor,
  PluginManager,
  ComponentManager,
  ComponentDefRaw,
  ComponentDef,

  PluginCallbackBuilderParams,
  AttributeChangedCallback,
  // ConnectedCallback,
  // DisconnectedCallback,
  FormAssociatedCallback,
  FormDisabledCallback,
  // FormResetCallback,
  FormStateRestoreCallback,
} from './types.ts'
import {
  $attr,
  $attrBool,

  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  FORM_ASSOCIATED,
  FORM_DISABLED,
  FORM_RESET,
  FORM_STATE_RESTORE,

  STATIC_FORM_ASSOCIATED,
  STATIC_OBSERVED_ATTRIBUTES,
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

export async function defineComponent(man: ComponentManager, plugins: PluginManager, defMut: ComponentDefRaw) {
  const def = Object.freeze(defMut)
  const {name, tpl} = def

  const frags = (tpl.cloneNode(true) as HTMLTemplateElement).content
  if (frags.querySelector('template[shadowrootmode]')) {
    throw `Component '${name}' used template attribute 'shadowrootmode'. Declarative Shadow Dom (DSD) is not allowed.`
  }

  await plugins.parse({man, def, frags})

  const [Raw, exports, shadowRootOpts, customElementOpts, componentOpts] = await parseScript(name, frags)

  const Com = createComponentConstructor(
    man,
    plugins,
    def,
    Raw,
    frags,
    shadowRootOpts,
    componentOpts,
  )

  await plugins.define({man, def, Com, Raw, exports})
  customElements.define(name, Com, customElementOpts)

  return def
}

async function parseScript(name: string, frags: DocumentFragment): Promise<ParsedScript> {
  const script: HTMLScriptElement | null = frags.querySelector('script')
  script?.remove()

  const blobURL = URL.createObjectURL(
    new Blob([script?.text ?? ''], {type: 'text/javascript'})
  )
  const module = await import(
    /* @vite-ignore */
    `${blobURL}#${name}`
  )
  URL.revokeObjectURL(blobURL)

  const {
    default: Raw = class extends HTMLElement implements WebComponent {},
    ...exports
  } = module as {default: RawComponentConstructor} & ModuleExports

  return [
    Raw,
    exports,
    {
      mode: $attr(script, 'mode') ?? 'closed',
      slotAssignment: $attr(script, 'slotAssignment') ?? undefined,
      delegatesFocus: $attrBool(script, 'delegatesFocus') ?? undefined,
    },
    {
      extends: $attr(script, 'extends') ?? undefined,
    },
    {
      internals: $attrBool(script, 'internals') ?? undefined,
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
  frags: DocumentFragment,
  shadowRootOpts: ShadowRootInit,
  componentOpts: ComponentOpts,
): WebComponentConstructor {
  const Com = class extends Raw implements WebComponent {
    static [STATIC_FORM_ASSOCIATED] = Raw[STATIC_FORM_ASSOCIATED] ?? false
    static [STATIC_OBSERVED_ATTRIBUTES] = [...(Raw[STATIC_OBSERVED_ATTRIBUTES] ?? [])]

    static get def() { return def }

    #shadow = this.attachShadow(shadowRootOpts)
    #internals = componentOpts.internals ? this.attachInternals() : undefined

    constructor() {
      super()

      this.#shadow.append(frags.cloneNode(true))
      plugins.construct({
        man,
        def,
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

    async [FORM_ASSOCIATED](...params: Parameters<FormAssociatedCallback>) {
      plugins[FORM_ASSOCIATED](this.#params, params)
      await super[FORM_ASSOCIATED]?.(...params)
    }

    async [FORM_DISABLED](...params: Parameters<FormDisabledCallback>) {
      plugins[FORM_DISABLED](this.#params, params)
      await super[FORM_DISABLED]?.(...params)
    }

    async [FORM_RESET]() {
      plugins[FORM_RESET](this.#params)
      await super[FORM_RESET]?.()
    }

    async [FORM_STATE_RESTORE](...params: Parameters<FormStateRestoreCallback>) {
      plugins[FORM_STATE_RESTORE](this.#params, params)
      await super[FORM_STATE_RESTORE]?.(...params)
    }

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
  componentOpts: ComponentOpts,
]

type ComponentOpts = {
  internals: boolean,
}
