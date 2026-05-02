import type {
  DirectiveHandler,
} from '../reference.ts'
import {
  STORE_MOD_VAR,
  storeMods,
} from '../../reference.ts'
import {
  isObject,
  ObjectEntriesEach,
} from '../../common.ts'
import { evaluate } from '../expression.ts'

export const _data: DirectiveHandler = (
  ctx,
  _el,
  {
    camel,
    mods,
    expr,
  },
) => {
  const [mod = STORE_MOD_VAR] = storeMods.intersection(mods)

  try {
    const v = evaluate(expr, ctx)
    if (camel) {
      addItem(camel, v)
    } else if (isObject(v)) {
      ObjectEntriesEach(v, e => addItem(...e))
    } else {
      throw ''
    }
  } catch (e) {
    console.warn(`[$${camel}]`, e)
  }

  function addItem(k: string, v: any) {
    if (storeMods.has(mod)) {
      ctx[mod](k, v)
    }
  }
}
