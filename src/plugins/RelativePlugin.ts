import type {
  PluginParseParams,
  Plugin,
  ComponentDef,
} from '../ucom'

export default class RelativePlugin implements Plugin {
  async parse({ident, frags}: PluginParseParams) {
    this.#parseScript(ident, frags)
    this.#parseStyle(ident, frags)
  }

  #parseScript({resolved}: ComponentDef, frags: DocumentFragment) {
    for (const script of frags.querySelectorAll('script')) {
      script.text = script.text.replace(
        /(import|from)\s*("|')(\.{0,2}\/.*?[^\\])\2/g,
        (_, keyword, quote, path) => {
          const base = new URL('', resolved)
          return keyword + quote + new URL(path, base) + quote
        }
      )
    }
  }

  #parseStyle({resolved}: ComponentDef, frags: DocumentFragment) {
    for (const style of frags.querySelectorAll('style')) {
      style.innerHTML = style.innerHTML.replace(
        /(@import)\s*("|')(\.{0,2}\/.*?[^\\])\2/g,
        (_, keyword, quote, path) => {
          const base = new URL('', resolved)
          return keyword + quote + new URL(path, base) + quote
        }
      )
    }
  }
}