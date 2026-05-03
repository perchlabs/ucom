import type {
  DirectiveHandler,
} from '../reference.ts'
import { isFunction } from '../../common.ts'
import { evaluate } from '../expression.ts'

type handlerFunc = ($event: Event) => any
const simplePathRE =
  /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/

export const _event: DirectiveHandler = (
  ctx,
  el,
  {
    camel,
    expr,
  },
) => {
  if (!camel) {
    return
  }

  let handler: handlerFunc | undefined
  if (simplePathRE.test(expr)) {
    const value = evaluate(expr, ctx)
    if (isFunction(value)) {
      handler = value
    }
  } else {
    handler = evaluate(`$event => ${expr}`, ctx) as handlerFunc
  }

  if (handler) {
    el.addEventListener(camel, handler)
    ctx.push(() => el.removeEventListener(camel, handler))
  }
}
