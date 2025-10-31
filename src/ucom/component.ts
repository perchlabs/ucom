import type {
  RawComponentConstructor,
  WebComponent,
  ModuleExports,
  ComponentIdentity,
  WebComponentConstructor,
  PluginManager,
  ComponentManager,
  ComponentDef,
  PluginCallbackProviderParams,
  AttributeChangedCallback,
  ConnectedCallback,
  DisconnectedCallback,
  FormAssociatedCallback,
  FormDisabledCallback,
  FormResetCallback,
  FormStateRestoreCallback,
} from './types.ts'
import {
  $attr,
  $attrBool,
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

export async function defineComponent(params: {
  man: ComponentManager,
  plugins: PluginManager,
  ident: ComponentDef,
}) {
  const {man, plugins} = params
  const ident = Object.freeze(params.ident)
  const {name, tpl} = ident

  const frags = (tpl.cloneNode(true) as HTMLTemplateElement).content
  if (frags.querySelector('template[shadowrootmode]')) {
    throw `Component '${name}' used template attribute 'shadowrootmode'. Declarative Shadow Dom (DSD) is not allowed.`
  }

  await plugins.parse({man, ident, frags})

  const {Raw, exports, shadowRootOpts, customElementOpts, componentOpts} = await parseScript(name, frags)
  Object.defineProperty(Raw, 'name', { get() { return name } })

  const Component = createComponentConstructor({
    man,
    ident,
    Raw,
    frags,
    exports,
    plugins,
    shadowRootOpts,
    componentOpts,
  })

  await plugins.define({man, ident, Component, Raw, exports})
  customElements.define(name, Component, customElementOpts)

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

  return {
    Raw,
    exports,
    shadowRootOpts: {
      mode: $attr(script, 'mode') ?? 'closed',
      slotAssignment: $attr(script, 'slotAssignment') ?? undefined,
      delegatesFocus: $attrBool(script, 'delegatesFocus') ?? undefined,
    },
    customElementOpts: {
      extends: $attr(script, 'extends') ?? undefined,
    },
    componentOpts: {
      internals: $attrBool(script, 'internals') ?? undefined,
    },
  }
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

function createComponentConstructor(schema: ComponentSchema): WebComponentConstructor {
  const {man, plugins, ident, Raw, frags, shadowRootOpts, componentOpts} = schema

  const Component = class extends Raw implements WebComponent {
    static formAssociated = Raw.formAssociated ?? false
    static observedAttributes = [...(Raw.observedAttributes ?? [])]

    static get ident() { return ident }

    #methods: RegisteredCoreMethods = {}
    #shadow = this.attachShadow(shadowRootOpts)
    #internals = componentOpts.internals ? this.attachInternals() : undefined

    constructor() {
      super()

      this.#shadow.append(frags.cloneNode(true))
      plugins.construct({
        man,
        ident,
        Component,
        Raw,
        el: this,
        shadow: this.#shadow,
      })
    }

    async attributeChangedCallback(...params: [name: string, oldValue: string | null, newValue: string | null]) {
      const k = 'attributeChanged'
      this.#methods[k] ??= plugins[k](this.#params)
      this.#methods[k].forEach(async f => await f(...params))

      await super[`${k}Callback`]?.(...params)
    }

    async connectedCallback() {
      const k = 'connected'
      this.#methods[k] ??= plugins[k](this.#params)
      this.#methods[k].forEach(async f => await f())

      const params: {shadow: ShadowRoot, internals?: ElementInternals} = {
        shadow: this.#shadow,
      }
      if (this.#internals) {
        params.internals = this.#internals
      }
      await super[`${k}Callback`]?.(params)
    }

    async disconnectedCallback() {
      const k = 'disconnected'
      this.#methods[k] ??= plugins[k](this.#params)
      this.#methods[k].forEach(async f => await f())

      await super[`${k}Callback`]?.()
    }

    async formAssociated(...params: [form: HTMLFormElement | null]) {
      const k = 'formAssociated'
      this.#methods[k] ??= plugins[k](this.#params)
      this.#methods[k].forEach(async f => await f(...params))

      await super[`${k}Callback`]?.(...params)
    }

    async formDisabledCallback(...params: [isDisabled: boolean]) {
      const k = 'formDisabled'
      this.#methods[k] ??= plugins[k](this.#params)
      this.#methods[k].forEach(async f => await f(...params))

      await super[`${k}Callback`]?.(...params)
    }

    async formResetCallback() {
      const k = 'formReset'
      this.#methods[k] ??= plugins[k](this.#params)
      this.#methods[k].forEach(async f => await f())

      await super[`${k}Callback`]?.()
    }

    async formStateRestoreCallback(...params: [state: string | File | FormData, reason: 'autocomplete' | 'restore']) {
      const k = 'formStateRestore'
      this.#methods[k] ??= plugins[k](this.#params)
      this.#methods[k].forEach(async f => await f(...params))

      await super[`${k}Callback`]?.(...params)
    }

    get #params(): PluginCallbackProviderParams {
      return {
        Component,
        Raw,
        el: this,
        shadow: this.#shadow,
      }
    }
  }
  return Component
}

type ParsedScript = {
  Raw: RawComponentConstructor,
  exports: ModuleExports,
  shadowRootOpts: ShadowRootInit,
  customElementOpts: ElementDefinitionOptions,
  componentOpts: ComponentOpts,
}

type ComponentOpts = {
  internals: boolean,
}

type ComponentSchema = {
  man: ComponentManager,
  ident: ComponentDef

  Raw: RawComponentConstructor,
  frags: DocumentFragment,

  exports: ModuleExports,
  plugins: PluginManager,

  shadowRootOpts: ShadowRootInit,
  componentOpts: ComponentOpts,
}

type RegisteredCoreMethods = {
  connected?: ConnectedCallback[]
  disconnected?: DisconnectedCallback[]
  attributeChanged?: AttributeChangedCallback[]
  formAssociated?: FormAssociatedCallback[]
  formDisabled?: FormDisabledCallback[]
  formReset?: FormResetCallback[]
  formStateRestore?: FormStateRestoreCallback[]
}
