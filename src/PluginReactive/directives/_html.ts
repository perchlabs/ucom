import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import { evaluate } from '../expression.ts'

export function _html(ctx: Context, dir: DirectiveDef, el: Element): undefined {
  const {expr} = dir

  // Create an effect that automatically re-runs when signals change
  ctx.effect(() => {
    try {
      // Evaluate the expression (e.g., "count" or "firstName + ' ' + lastName")
      el.innerHTML = evaluate(expr, ctx) ?? ''
    } catch (e) {
      console.error('[u-html] ', e)
    }
  })
}
