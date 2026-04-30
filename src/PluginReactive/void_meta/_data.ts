import type {
  Context,
  DirectiveHandler,
} from '../reference.ts'
import {
  STORE_MOD_VAR,
  storeMods,
} from '../../reference.ts'
import { isObject } from '../../common.ts'
import { evaluate } from '../expression.ts'

export const _data: DirectiveHandler = (
  ctx,
  _el,
  {
    camel,
    mods,
    expr = '',
  },
) => {
  const [mod = STORE_MOD_VAR] = storeMods.intersection(mods)

  // Create an effect that automatically re-runs when signals change
  ctx.effect(() => {
    try {
      const v = evaluate(expr, ctx)

      if (camel) {
        addItem(ctx, camel, v)
      } else if (isObject(v)) {
        for (const k in v) {
          addItem(ctx, k, v[k])
        }
      } else {
        console.warn(`[$${camel}] invalid type`)
      }
    } catch (e) {
      console.error(`[$${camel}] `, e)
    }
  })

  function addItem(ctx: Context, camel: string, v: any) {
    if (storeMods.has(mod)) {
      ctx[mod](camel, v)
    }
  }
}
