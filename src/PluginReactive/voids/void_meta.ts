import type {
  Context,
} from '../types.ts'
import { getDirectives } from '../directive.ts'
import { makeElementAs } from '../utils.ts'
import { _data } from '../directives/_data.ts'
import { _text } from '../directives/_text.ts'

const reDir = /^u-|\$|%/

export function void_meta(ctx: Context, el: HTMLMetaElement) {
  for (const def of getDirectives(el, reDir)) {

    switch (def.key) {
      case '$': {
        _data(ctx, el, def)
        break
      }
      case '%': {
        const span = makeElementAs(el, 'span')
        _text(ctx, span, def)
        el.replaceWith(span)
        return span
      }
    }
  }
}
