import type {
  PluginParseParams,
  Plugin,
} from '../core'

export default class implements Plugin {
  async parse({
    frags,
    def: {resolved},
  }: PluginParseParams) {
    for (const script of frags.querySelectorAll('script')) {
      script.text = script.text.replace(
        /(import|from)\s*("|')(\.{0,2}\/.*?[^\\])\2/g,
        (_, keyword, quote, path) => {
          const base = new URL('', resolved)
          return keyword + quote + new URL(path, base) + quote
        }
      )
    }

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