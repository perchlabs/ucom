import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  createElement,
} from '../../common.ts'
import {
  nextWalkable, contextableParent,
} from '../utils.ts'
import { getDirectives } from '../directive.ts'
import { _data } from './_data.ts'
import { _cssprop } from './_cssprop.ts'
import { _text } from '../directives/_text.ts'

export function void_meta(ctx: Context, el: HTMLMetaElement) {
  const dirMap: Record<string, (def: DirectiveDef) => void> = {
    $(def: DirectiveDef) {
      _data(ctx, def, el)
    },
    '--'(def: DirectiveDef) {
      _cssprop(ctx, def, el)
    },
    '$--'(def: DirectiveDef) {
      _data(ctx, def, el)
      _cssprop(ctx, {
        ...def,
        expr: '',
      }, el)
    },
    '%'(def: DirectiveDef) {
      const span = createElement('span')
      _text(ctx, def, span)
      const parent = contextableParent(el)!
      parent.insertBefore(span, el)
    },
  }

  for (const def of getDirectives(el, /^\$|\$--|--|%/)) {
    dirMap[def.key]?.(def)
  }

  const next = nextWalkable(el)
  el.remove()

  return next
}

