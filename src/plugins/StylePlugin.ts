import type {
  QueryableRoot,
  PluginStartParams,
  PluginConstructParams,
  Plugin,
} from '../core'
import {
  ATTR_CORE,
} from '../core'

export default class implements Plugin {
  #sheetsLoader?: Promise<CSSStyleSheet[]>
  #sheets: CSSStyleSheet[] = []

  async init() {
    // Preload sheets
    this.#getSheetsLoader()
  }

  async start(_params: PluginStartParams) {
    this.#sheets.push(...await this.#getSheetsLoader())
  }

  construct({shadow}: PluginConstructParams): void {
    shadow.adoptedStyleSheets.push(...this.#sheets)
  }

  #getSheetsLoader(): Promise<CSSStyleSheet[]> {
    if (!this.#sheetsLoader) {
      this.#sheetsLoader = this.#loadSheets()
    }
    return this.#sheetsLoader
  }

  // TODO: Revisit this when Safari and Firefox support CSS imports "with {type: 'css'}".
  // Note: Constructed stylesheet asynchronous replace method no longer handles CSS @import rules as 2025.
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with#browser_compatibility
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with#browser_compatibility
  async #loadSheets(): Promise<CSSStyleSheet[]> {
    const loading = $queryForLibAttr(document.head, 'link', 'style')
      .map(el => {
        if (!(el instanceof HTMLStyleElement || el instanceof HTMLLinkElement)) {
          return
        }
        return new Promise((resolve, reject) => {
          if (el.sheet) {
            return resolve(el.sheet)
          }
          el.addEventListener('load', () => resolve(el.sheet), false)
          el.addEventListener('error', () => reject(new Error('link failed loading')), false)
        })
      })
      .filter(v => Boolean(v))

    return (await Promise.allSettled(loading))
      .filter(v => v?.status === 'fulfilled')
      .map(v => v.value as CSSStyleSheet)
      .map((domSheet: CSSStyleSheet) => {
        // Shadowdom can only use constructable style sheets.
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(Array.from(domSheet.cssRules).map(v => v.cssText).join(' '))
        return sheet
      })
  }
}

export function $queryForLibAttr(root: QueryableRoot, ...tagNames: string[]) {
  const selector = tagNames.map(k => `${k}[${ATTR_CORE}]`).join(',')
  return [...root.querySelectorAll(selector)]
}
