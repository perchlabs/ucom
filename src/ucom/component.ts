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
  tpl.innerHTML =  text
  // Keep the prestine template so that plugins can reference it.
  Object.freeze(tpl)

  return tpl
}

export class ComponentFetchError extends Error {
  #resolved: string
  #reason: string
  get resolved() { return this.#resolved }
  get reason() { return this.#reason }

  constructor(resolved: string, reason: string = 'Unspecified reason.') {
    super()

    this.#resolved = resolved
    this.#reason = reason
  }
}

export async function defineComponent(man: ComponentManager, plugins: PluginManager, identMut: ComponentDef) {
  const ident = Object.freeze(identMut)
  const {name, tpl} = ident

  const frags = (tpl.cloneNode(true) as HTMLTemplateElement).content
  if (frags.querySelector('template[shadowrootmode]')) {
    throw `Component '${name}' used template attribute 'shadowrootmode'. Declarative Shadow Dom (DSD) is not allowed.`
  }

  await plugins.parse({man, ident, frags})

  const [Raw, exports, shadowRootOpts, customElementOpts, componentOpts] = await parseScript(name, frags)
  const Com = createComponentConstructor(
    man,
    plugins,
    ident,
    Raw,
    frags,
    shadowRootOpts,
    componentOpts,
  )

  await plugins.define({man, ident, Com, Raw, exports})
  customElements.define(name, Com, customElementOpts)

  return ident
}

async function parseScript(name: string, frags: DocumentFragment): Promise<ParsedScript> {
  const script: HTMLScriptElement | null = frags.querySelector('script[setup]') ?? frags.querySelector('script')
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

export function hashContent(data: HTMLTemplateElement | DocumentFragment): string {
  const frags = data instanceof DocumentFragment ? data : data.content
  const div = document.createElement('div')
  div.appendChild(frags.cloneNode(true))
  return div.innerHTML
    .split('')
    .reduce((hash, char) => char.charCodeAt(0) + (hash << 6) + (hash << 16) - hash, 0)
    .toString()
}

function createComponentConstructor(
  man: ComponentManager,
  plugins: PluginManager,
  ident: ComponentDef,
  Raw: RawComponentConstructor,
  frags: DocumentFragment,
  shadowRootOpts: ShadowRootInit,
  componentOpts: ComponentOpts,
): WebComponentConstructor {
  const formAssociated = 'formAssociated'
  const observedAttributes = 'observedAttributes'

  const Com = class extends Raw implements WebComponent {
    static [formAssociated] = Raw[formAssociated] ?? false
    static [observedAttributes] = [...(Raw[observedAttributes] ?? [])]

    static get ident() { return ident }

    #shadow = this.attachShadow(shadowRootOpts)
    #internals = componentOpts.internals ? this.attachInternals() : undefined

    constructor() {
      super()

      this.#shadow.append(frags.cloneNode(true))
      plugins.construct({
        man,
        ident,
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
