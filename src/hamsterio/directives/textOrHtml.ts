import type { Context } from '../types.ts'
import { createEffect } from '../signal.ts'
import { evaluateExpression } from '../expression.ts'

export function bindTextOrHTML(el: HTMLElement, expr: string, ctx: Context, isHTML = false) {
  // Create an effect that automatically re-runs when signals change
  const dispose = createEffect(() => {
    try {
      // Evaluate the expression (e.g., "count" or "firstName + ' ' + lastName")
      const value = evaluateExpression(expr, ctx) ?? ''

      // Check whether to update innerHTML or textContent
      if (isHTML) {
        // Update the HTML content (converts undefined/null to empty string)
        el.innerHTML = value
      } else {
        // Update the text content (converts undefined/null to empty string)
        el.textContent = value
      }

    } catch (e) {
      console.error('🐹 [u-text] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}
