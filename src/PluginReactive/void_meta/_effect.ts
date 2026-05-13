import type {
  DirectiveHandler,
} from '../reference.ts'
import { isFunction } from '../../common.ts'

export const _effect: DirectiveHandler = (
  ctx,
  _el,
  {
    exp,
    mods,
  },
) => {
  const value = ctx.eval(exp)
  if (isFunction(value)) {
    if (mods.has('once')) {
      value()
    } else {
      ctx.effect(value)
    }
  }
}
