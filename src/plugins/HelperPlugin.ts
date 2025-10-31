import type {
  Plugin,
  PluginStartParams,
  PluginDefineParams,
} from '../ucom'

const NAME_PRINTER = 'u-print'

export default class HelperPlugin implements Plugin {
  #tplMap: Record<string, HTMLTemplateElement> = {}

  async start(_params: PluginStartParams) {
    this.#definePrinter()
  }

  async define({ident}: PluginDefineParams): Promise<void> {
    this.#tplMap[ident.name] = ident.tpl
  }

  #definePrinter() {
    const tplMap = this.#tplMap

    class Printer extends HTMLElement {
      static get observedAttributes() {
        return ['name']
      }

      #hasRun = false

      async connectedCallback() {
        this.#tryRun(this.getAttribute('name'))
      }

      attributeChangedCallback(_name: string, _oldValue: string | null, newValue: string | null) {
        this.#tryRun(newValue)
      }

      async #tryRun(name: string | null) {
        if (this.#hasRun) {
          return
        }
        if (!name) {
          return
        }
        this.#hasRun = true

        await customElements.whenDefined(name)

        const parent = this.parentElement ?? this.getRootNode() as ShadowRoot
        if (!parent) {
          console.error('Could not find parent.')
          return
        }

        const tpl = tplMap[name]
        parent.insertBefore(tpl.cloneNode(true), this)
        parent.removeChild(this)
      }
    }
    customElements.define(NAME_PRINTER, Printer)
  }
}
