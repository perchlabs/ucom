import type {
  DirectiveHandler,
} from '../reference.ts'
import {
  isShadowRoot,
  createElement,
} from '../../common.ts'
import {
  contextableParent,
} from '../utils.ts'
import { evaluate } from '../expression.ts'

export const _cssprop: DirectiveHandler = (
  ctx,
  el,
  {
    camel,
    kebab,
    expr,
    mods,
  },
) => {
  const exprReal = expr || camel
  if (!exprReal) {
    return
  }

  const style = createElement('style')
  el.before(style)

  ctx.effect(() => {
    try {
      let value = evaluate(exprReal, ctx) as string
      if (mods.has('escape')) {
        value = `"${CSS.escape(value)}"`
      }

      const scope = isShadowRoot(contextableParent(style))
        ? `:host`
        : '@scope'
      style.textContent = `${scope} { --${kebab}: ${value}; }`
    } catch (e) {
      console.error(`[--${kebab}] `, e)
    }
  })
}
