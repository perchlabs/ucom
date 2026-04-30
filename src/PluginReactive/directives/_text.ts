import type {
  DirectiveHandler,
} from '../reference.ts'
import { evaluate } from '../expression.ts'

export const _text: DirectiveHandler = (
  ctx,
  el,
  {camel, expr},
) => {
  const exprReal = camel ?? expr
  if (!exprReal) {
    return
  }

  // Create an effect that automatically re-runs when signals change
  ctx.effect(() => {
    try {
      el.textContent = evaluate(exprReal, ctx) ?? ''
    } catch (e) {
      console.error('[u-text] ', e)
    }
  })
}
