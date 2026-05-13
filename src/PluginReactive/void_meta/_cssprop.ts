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

export const _cssprop: DirectiveHandler = (
  ctx,
  el,
  {
    camel,
    kebab,
    exp,
    mods,
  },
) => {
  const exprReal = exp || camel
  if (!exprReal) {
    return
  }

  const style = createElement('style')
  el.before(style)

  ctx.effect(() => {
    try {
      let value = ctx.eval(exprReal) as string
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
