import type { Context } from '../types.ts'
import { createEffect } from '../signal.ts'
import { evaluate } from '../expression.ts'

export function bindTextOrHTML(ctx: Context, el: HTMLElement, expr: string, isHTML = false) {
  // Create an effect that automatically re-runs when signals change
  const dispose = createEffect(() => {
    const index = isHTML ? 'innerHTML' : 'textContent' 
    try {
      // Evaluate the expression (e.g., "count" or "firstName + ' ' + lastName")
      el[index] = evaluate(expr, ctx) ?? ''
    } catch (e) {
      console.error('🐹 [u-text] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}
