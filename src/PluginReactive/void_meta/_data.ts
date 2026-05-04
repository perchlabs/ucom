import {
  STORE_MOD_VAR,
  storeMods,
} from '../../reference.ts'
import type {
  DirectiveHandler,
} from '../reference.ts'
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
    exp,
  },
) => {
  const [mod = STORE_MOD_VAR] = storeMods.intersection(mods)
  const store = ctx[mod]

  try {
    const v = evaluate(exp, ctx)
    if (camel) {
      store([camel, v])
    } else if (isObject(v)) {
      ObjectEntriesEach(v, store)
    } else {
      throw ''
    }
  } catch (e) {
    console.warn(`[$${camel}]`, e)
  }
}
