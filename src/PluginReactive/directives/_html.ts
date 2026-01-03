import type { Context, DirectiveDef } from '../types.ts'
import { effect } from '../alien-signals'
import { evaluate } from '../expression.ts'

export function _html(ctx: Context, el: HTMLElement, dir: DirectiveDef): undefined {
  const {
    value: expr,
  } = dir

  // Create an effect that automatically re-runs when signals change
  const dispose = effect(() => {
    try {
      // Evaluate the expression (e.g., "count" or "firstName + ' ' + lastName")
      el.innerHTML = evaluate(expr, ctx) ?? ''
    } catch (e) {
      console.error('[u-text] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}
