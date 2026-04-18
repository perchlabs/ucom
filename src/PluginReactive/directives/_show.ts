import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import { evaluate } from '../expression.ts'

export function _show(ctx: Context, dir: DirectiveDef, el: Element) {
  const {expr} = dir

  const initialDisplay = (el as HTMLElement).style.display

  ctx.effect(() => {
    const show = evaluate(expr, ctx) as boolean
    (el as HTMLElement).style.display = show ? initialDisplay : 'none'
  })
}
