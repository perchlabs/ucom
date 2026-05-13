import type {
  DirectiveHandler,
} from '../reference.ts'
import { isFunction } from '../../common.ts'
import { simplePathRE } from '../expression.ts'

type handlerFunc = ($event: Event) => any

export const _event: DirectiveHandler = (
  ctx,
  el,
  {
    camel,
    exp,
  },
) => {
  if (!camel) {
    return
  }

  let handler: handlerFunc | undefined
  if (simplePathRE.test(exp)) {
    const value = ctx.eval(exp)
    if (isFunction(value)) {
      handler = value
    }
  } else {
    handler = ctx.eval(`$event => ${exp}`) as handlerFunc
  }

  if (handler) {
    el.addEventListener(camel, handler)
    ctx.push(() => el.removeEventListener(camel, handler))
  }
}
