import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import { effect } from '../alien-signals'
import { evaluate } from '../expression.ts'

export function _text(ctx: Context, dir: DirectiveDef, el: HTMLElement) {
  const expr = dir.ref ? dir.ref : dir.expr

  // Create an effect that automatically re-runs when signals change
  const dispose = effect(() => {
    try {
      el.textContent = evaluate(expr, ctx) ?? ''
    } catch (e) {
      console.error('[u-text] ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}
