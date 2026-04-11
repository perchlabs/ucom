import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import { getDirectives } from '../directive.ts'
import { nextWalkable, getParent } from '../utils.ts'
import { _data } from '../directives/_data.ts'
import { _text } from '../directives/_text.ts'

export function void_meta(ctx: Context, el: HTMLMetaElement) {
  const dirMap: Record<string, (def: DirectiveDef) => void> = {
    $(def: DirectiveDef) {
      _data(ctx, def, el)
    },
    '%'(def: DirectiveDef) {
      const span = document.createElement('span')
      _text(ctx, def, span)
      const parent = getParent(el)!
      parent.insertBefore(span, el)
    },
  }

  for (const def of getDirectives(el, /^\$|%/)) {
    dirMap[def.key]?.(def)
  }

  const next = nextWalkable(el)
  el.remove()

  return next
}

