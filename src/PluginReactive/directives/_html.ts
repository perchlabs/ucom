import type {
  DirectiveHandler,
} from '../reference.ts'
import { evaluate } from '../expression.ts'

export const _html: DirectiveHandler = (
  ctx,
  el,
  {expr},
) => {
  if (!expr) {
    return
  }

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
