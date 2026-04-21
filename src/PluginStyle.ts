import type {
  QueryableRoot,
  ComponentManager,
  PluginConstructParams,
  Plugin,
} from './types.ts'
import {
  queryAll,
  ArrayFrom,
} from './common.ts'
import {
  SYS_PREFIX,
} from './constants.ts'

let sheets: CSSStyleSheet[]

export default {
  async start(_man: ComponentManager) {
    sheets = await loadSheets()
  },

  construct({root}: PluginConstructParams): void {
    root.adoptedStyleSheets.push(...sheets)
  },
} as Plugin

// TODO: Revisit this when Safari and Firefox support CSS imports "with {type: 'css'}".
// Note: Constructed stylesheet asynchronous replace method no longer handles CSS @import rules as 2025.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with#browser_compatibility
async function loadSheets(): Promise<CSSStyleSheet[]> {
  const loading = queryForStyles(document.head)
    .map(async el => el.sheet ?
      el.sheet :
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

function queryForStyles(root: QueryableRoot) {
  const selector = ['STYLE', 'LINK'].map(k => `${k}[${SYS_PREFIX}]`).join(',')
  return queryAll<HTMLStyleElement | HTMLLinkElement>(root, selector)
}
