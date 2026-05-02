import type {
  DirectiveHandler,
} from '../reference.ts'
import { isFunction } from '../../common.ts'
import { evaluate } from '../expression.ts'

export const _effect: DirectiveHandler = (
  ctx,
  _el,
  {
    expr,
    mods,
  },
) => {
  const value = evaluate(expr, ctx)
  if (isFunction(value)) {
    if (mods.has('once')) {
      value()
    } else {
      ctx.effect(value)
    }
  }
}
