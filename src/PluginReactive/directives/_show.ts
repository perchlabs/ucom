import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import { effect } from '../alien-signals'
import { evaluate } from '../expression.ts'

export function _show(ctx: Context, dir: DirectiveDef, el: HTMLElement) {
  const {expr} = dir

  const initialDisplay = el.style.display

  const dispose = effect(() => {
    const show = evaluate(expr, ctx)
    el.style.display = show ? initialDisplay : 'none'
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}
