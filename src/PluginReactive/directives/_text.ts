import type { Context, DirectiveDef } from '../types.ts'
import { effect } from '../alien-signals'
import { evaluate } from '../expression.ts'
import { makeElementAs } from '../utils.ts'

export function _text(ctx: Context, el: HTMLElement, dir: DirectiveDef) {
  if (el.tagName === 'META') {
    const span = makeElementAs(el, 'span')
    el.replaceWith(span)
    return span
  }

  const expr = dir.modifier ? dir.modifier : dir.value

  // Create an effect that automatically re-runs when signals change
  const dispose = effect(() => {
    try {
      // Evaluate the expression (e.g., "count" or "firstName + ' ' + lastName")
      el.textContent = evaluate(expr, ctx) ?? ''
    } catch (e) {
      console.error('[u-text] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}
