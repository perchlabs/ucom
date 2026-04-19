import type {
  QueryableRoot,
  PluginStartParams,
  PluginConstructParams,
  Plugin,
} from './types.ts'
import {
  queryAll,
  ArrayFrom,
} from './common.ts'
import {
  ATTR_CORE,
} from './constants.ts'

let sheets: CSSStyleSheet[]

export default {
  async start(_params: PluginStartParams) {
    sheets = await loadSheets()
  },

  construct({shadow}: PluginConstructParams): void {
    shadow.adoptedStyleSheets.push(...sheets)
  },
} as Plugin

// TODO: Revisit this when Safari and Firefox support CSS imports "with {type: 'css'}".
// Note: Constructed stylesheet asynchronous replace method no longer handles CSS @import rules as 2025.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with#browser_compatibility
async function loadSheets(): Promise<CSSStyleSheet[]> {
  const loading = queryForStyles(document.head)
    .map(el => {
      return new Promise((resolve, reject) => {
        if (el.sheet) {
          return resolve(el.sheet)
        }
        el.addEventListener('load', () => resolve(el.sheet), false)
        el.addEventListener('error', () => reject(new Error('theme failed loading')), false)
      })
    })
    .filter(v => Boolean(v))

  return (await Promise.allSettled(loading))
    .filter(v => v?.status === 'fulfilled')
    .map(v => v.value as CSSStyleSheet)
    .map((domSheet) => {
      // Shadowdom can only use constructable style sheets.
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(ArrayFrom(domSheet.cssRules).map(v => v.cssText).join(' '))
      return sheet
    })
}

function queryForStyles(root: QueryableRoot) {
  const selector = ['STYLE', 'LINK'].map(k => `${k}[${ATTR_CORE}]`).join(',')
  return queryAll<HTMLStyleElement | HTMLLinkElement>(root, selector)
}
