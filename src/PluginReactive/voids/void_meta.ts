import type {
  Context,
  ContextableNode,
} from '../types.ts'
import { getDirectives } from '../directive.ts'
import { makeElementAs } from '../utils.ts'
import { _data } from '../directives/_data.ts'
import { _text } from '../directives/_text.ts'

export function void_meta(ctx: Context, parent: ContextableNode, el: HTMLMetaElement) {
  for (const def of getDirectives(el, /^\$|%/)) {
    switch (def.key) {
      case '$': {
        _data(ctx, def, parent, el)
        break
      }
      case '%': {
        const span = makeElementAs(el, 'span')
        _text(ctx, def, parent, span)
        el.replaceWith(span)
        return span
      }
    }
  }
}
