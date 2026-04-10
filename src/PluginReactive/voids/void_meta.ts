import type {
  Context,
} from '../types.ts'
import { getDirectives } from '../directive.ts'
import { nextWalkable, getParent } from '../utils.ts'
import { _data } from '../directives/_data.ts'
import { _text } from '../directives/_text.ts'

export function void_meta(ctx: Context, el: HTMLMetaElement) {
  const next = nextWalkable(el)
  const parent = getParent(el)!

  for (const def of getDirectives(el, /^\$|%/)) {
    switch (def.key) {
      case '$': {
        _data(ctx, def, el)
        break
      }
      case '%': {
        const span = document.createElement('span')
        _text(ctx, def, span)
        parent.insertBefore(span, el)
        break
      }
    }
  }

  el.remove()

  return next
}
