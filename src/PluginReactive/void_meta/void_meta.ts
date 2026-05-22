import type { DirectiveDef } from '../../reference.ts'
import type { Context } from '../reference.ts'
import { createElement } from '../../common.ts'
import { getDirectives } from '../../directive.ts'
import { nextWalkable, contextableParent } from '../utils.ts'
import { _data } from './_data.ts'
import { _cssprop } from './_cssprop.ts'
import { _effect } from './_effect.ts'
import { _text } from '../directives/_text.ts'

export const void_meta = (ctx: Context, el: HTMLMetaElement) => {
  const dirMap: Record<string, (def: DirectiveDef) => void> = {
    $(def: DirectiveDef) {
      _data(ctx, el, def)
    },
    '--'(def: DirectiveDef) {
      _cssprop(ctx, el, def)
    },
    '$--'(def: DirectiveDef) {
      _data(ctx, el, def)
      _cssprop(ctx, el, {
        ...def,
        exp: '',
      })
    },
    '#effect'(def: DirectiveDef) {
      _effect(ctx, el, def)
    },
    '%'(def: DirectiveDef) {
      const span = createElement('span')
      _text(ctx, span, def)
      const parent = contextableParent(el)!
      parent.insertBefore(span, el)
    },
  }

  for (const def of getDirectives(el, /^#|\$|--|\$--|%/)) {
    dirMap[def.op]?.(def)
  }

  const next = nextWalkable(el)
  el.remove()

  return next
}
