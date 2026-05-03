import type {
  QueryableRoot,
  ComponentManager,
  PluginConstructParams,
  Plugin,
} from './reference.ts'
import {
  queryAll,
  ArrayFrom,
} from './common.ts'
import {
  SYS_PREFIX,
} from './reference.ts'

let sheets: CSSStyleSheet[]

export default {
  async start(_man: ComponentManager) {
    sheets = await loadSheets()
  },

  construct({root}: PluginConstructParams): void {
    root.adoptedStyleSheets.push(...sheets)
  },
} as Plugin

// TODO: Revisit when Safari supports CSS imports "with {type: 'css'}".
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with#browser_compatibility
// Note: Constructed stylesheet asynchronous replace method no longer handles CSS @import rules as of 2025.
const loadSheets = async (): Promise<CSSStyleSheet[]> => {
  const loading = queryForStyles(document.head)
    .map(async el => el.sheet ??
      new Promise((resolve, reject) => {
        el.addEventListener('load', () => resolve(el.sheet), false)
        el.addEventListener('error', () => reject(new Error('theme loading')), false)
      })
    )

  return (await Promise.allSettled(loading))
    .filter(v => v?.status === 'fulfilled')
    .map(v => v.value as CSSStyleSheet)
    .map(domSheet => {
      // Shadowdom can only use constructable style sheets.
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(ArrayFrom(domSheet.cssRules).map(v => v.cssText).join(' '))
      return sheet
    })
}

const queryForStyles = (root: QueryableRoot) => {
  const selector = ['STYLE', 'LINK'].map(k => `${k}[${SYS_PREFIX}]`).join(',')
  return queryAll<HTMLStyleElement | HTMLLinkElement>(root, selector)
}
