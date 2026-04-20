import type {
  PluginParseParams,
  Plugin,
} from './types.ts'
import { queryAll } from './common.ts'

export default {
  async parse({
    frag,
    def: {path},
  }: PluginParseParams) {
    const callback = (_: string, keyword: string, quote: string, innerPath: string) =>
      keyword + quote + new URL(innerPath, new URL('', path)) + quote

    for (const script of queryAll<HTMLScriptElement>(frag, 'script')) {
      script.text = script.text.replace(
        /(import|from)\s*("|')(\.{0,2}\/.*?[^\\])\2/g,
        callback,
      )
    }

    for (const style of queryAll<HTMLStyleElement>(frag, 'style')) {
      style.innerHTML = style.innerHTML.replace(
        /(@import)\s*("|')(\.{0,2}\/.*?[^\\])\2/g,
        callback,
      )
    }
  },
} as Plugin
