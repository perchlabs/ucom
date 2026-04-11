import type {
  PluginParseParams,
  Plugin,
} from './types.ts'
import { queryAll } from './common.ts'

export default class implements Plugin {
  async parse({
    frag,
    def: {resolved},
  }: PluginParseParams) {
    for (const script of queryAll<HTMLScriptElement>(frag, 'script')) {
      script.text = script.text.replace(
        /(import|from)\s*("|')(\.{0,2}\/.*?[^\\])\2/g,
        (_, keyword, quote, path) => {
          const base = new URL('', resolved)
          return keyword + quote + new URL(path, base) + quote
        }
      )
    }

    for (const style of queryAll<HTMLStyleElement>(frag, 'style')) {
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