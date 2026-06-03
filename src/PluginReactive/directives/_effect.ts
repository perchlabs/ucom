import type {
  DirectiveHandler,
} from '../reference.ts'
import { isFunction } from '../../common.ts'
import { simplePathRE } from '../expression.ts'

const reArrowFunction = /^\(\s*\)\s*=>/

export const _effect: DirectiveHandler = (
  ctx,
  _el,
  {
    exp,
    mods,
  },
) => {
  const value = simplePathRE.test(exp) || reArrowFunction.test(exp)
    ? exp
    : `() => { ${exp} }`
  const func = ctx.eval(value)

  if (!isFunction(func)) {
    console.warn(`#effect: cannot create function from '${value}'`)
    return
  }

  if (mods.has('once')) {
    // TODO: 
    // value()
  } else {
    ctx.effect(func)
  }
}
