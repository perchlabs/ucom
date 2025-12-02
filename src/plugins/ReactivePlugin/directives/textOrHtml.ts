import type { Context, DirectiveDef } from '../types.ts'
import { effect } from '../alien-signals'
import { evaluate } from '../expression.ts'

export function dirTextOrHTML(ctx: Context, el: HTMLElement, dir: DirectiveDef) {
  const {
    key,
    value: expr,
  } = dir
  const index = key === 'u-html' ? 'innerHTML' : 'textContent' 

  // Create an effect that automatically re-runs when signals change
  const dispose = effect(() => {
    try {
      // Evaluate the expression (e.g., "count" or "firstName + ' ' + lastName")
      el[index] = evaluate(ctx, expr) ?? ''
    } catch (e) {
      console.error('[u-text] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}
