import type {
  Context,
  DirectiveHandler,
} from '../types.ts'
import { getDirectives } from '../directive.ts'

import { makeElementAs } from '../utils.ts'
import { _text } from '../directives/_text.ts'
import { _var } from '../directives/_var.ts'

export function void_meta(ctx: Context, el: HTMLMetaElement) {
  for (const def of getDirectives(el, reDir)) {
    const dir = dirMap[def.key]

    if (['u-text', '%'].includes(def.key)) {
      const span = makeElementAs(el, 'span')
      dir?.(ctx, span, def)
      el.replaceWith(span)
      return span
    }

    dir?.(ctx, el, def)
  }
}

const reDir = /^u-|\$|%/
const dirMap: Record<string, DirectiveHandler> = {
  'u-var': _var,
  '$': _var,
  'u-text': _text,
  '%': _text,
}
