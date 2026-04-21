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
  FILE_POSTFIX,
  DIR_POSTFIX,
} from './constants.ts'

import {
  ArrayFrom,
  ObjectFromEntries,
  attributeEntries,
  paramsAttrEach,
  cloneTemplateContent,
  getTopLevelChildren,
  reComponentPath,
} from './common.ts'

export function resolveImport(url: string): ComponentIdentity {
  const matches = reComponentPath.exec(url)
  if (!matches) {
    throw Error(`resolving '${url}'`)
  }

  const [,name, postfix] = matches
  if (postfix === DIR_POSTFIX) {
    url += `/${name}${FILE_POSTFIX}`
  }

  return {
    name,
    path: import.meta.resolve(url),
  }
}

export async function fetchTemplate(path: string): Promise<HTMLTemplateElement> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new ComponentFetchError(path, `Status ${res.status}`)
  }
  if (!res.headers.get('Content-Type')?.startsWith('text/html')) {
    throw new ComponentFetchError(path, 'Content-Type is not text/html')
  }
  const text = await res.text()
  if (text.startsWith('<!DOCTYPE')) {
    throw new ComponentFetchError(path, 'Content started with <!DOCTYPE')
  }

  const tpl = document.createElement('template')
  tpl.innerHTML = text

  return tpl
}

export class ComponentFetchError extends Error {
  resolved: string
  reason: string

  constructor(resolved: string, reason: string) {
    super()

    this.resolved = resolved
    this.reason = reason
  }
}

export async function defineComponent(man: ComponentManager, plugins: PluginManager, def: ComponentDef) {
  const {name, tpl} = def

  // Copy the fragment so that the original version will be available for printing.
  const frag = cloneTemplateContent(tpl)

  await plugins.parse({man, def, frag})

  const [Raw, exports, params] = await processFragment(frag)

  const modes: Record<string, string> = {}
  params.forEach(attrMap => {
    paramsAttrEach(attrMap, /^\+([a-z]+)/, (k, mode) => {
      modes[k] = mode
    })
  })

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
    extends: modes?.extends,
  })

  return def
}

async function processFragment(frag: DocumentFragment): Promise<ParsedFragment> {
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

  const params: Record<string, string>[] = getTopLevelChildren<HTMLParamElement>(frag, 'param')
    .map(el => {
      el.remove()
      return ObjectFromEntries(attributeEntries(el))
    })

  return [Raw, exports, params]
}

export function hashContent(tpl: HTMLTemplateElement): number {
  const div = document.createElement('div')
  div.appendChild(cloneTemplateContent(tpl))
  return ArrayFrom(div.innerHTML)
    .reduce((hash, char) => char.charCodeAt(0) + (hash << 6) + (hash << 16) - hash, 0)
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
  params: Record<string, string>[],
]

type WebComponentOpts = {
  internals: boolean | undefined,
}
