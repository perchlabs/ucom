import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import { evaluate } from '../expression.ts'

export function _show(ctx: Context, dir: DirectiveDef, el: HTMLElement) {
  const {expr} = dir

  const initialDisplay = el.style.display

  ctx.effect(() => {
    const show = evaluate(expr, ctx)
    el.style.display = show ? initialDisplay : 'none'
  })
}
