import type {
  DirectiveHandler,
} from '../reference.ts'
import { evaluate } from '../expression.ts'

export const _text: DirectiveHandler = (
  ctx,
  el,
  {camel, expr, mods},
) => {
  const exprReal = (camel ?? expr) || ''
  const prop = mods.has('html') ? 'innerHTML' : 'textContent'

  // Create an effect that automatically re-runs when signals change
  ctx.effect(() => {
    try {
      el[prop] = evaluate(exprReal, ctx) ?? ''
    } catch (e) {
      console.error('[text] ', e)
    }
  })
}
