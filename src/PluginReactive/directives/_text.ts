import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import { evaluate } from '../expression.ts'

export function _text(ctx: Context, dir: DirectiveDef, el: Element) {
  const expr = dir.ref ? dir.ref : dir.expr

  // Create an effect that automatically re-runs when signals change
  ctx.effect(() => {
    try {
      el.textContent = evaluate(expr, ctx) ?? ''
    } catch (e) {
      console.error('[u-text] ', e)
    }
  })
}
