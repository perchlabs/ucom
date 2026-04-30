import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  isShadowRoot,
  createElement,
} from '../../common.ts'
import {
  contextableParent,
} from '../utils.ts'
import { evaluate } from '../expression.ts'

export function _cssprop(ctx: Context, dir: DirectiveDef, el: Element) {
  const {
    camel,
    kebab,
    expr,
  } = dir

  if (!camel) {
    return
  }

  const style = createElement('style')
  el.before(style)

  const exprReal = expr ? expr : camel
  ctx.effect(() => {
    try {
      const value = evaluate(exprReal, ctx) as string

      const scope = isShadowRoot(contextableParent(style))
        ? `:host`
        : '@scope'
      style.textContent = `${scope} { --${kebab}: ${value}; }`
    } catch (e) {
      console.error(`[--${kebab}] `, e)
    }
  })
}
