import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  STORE_MOD_VAR,
  STORE_MOD_CALC,
  STORE_MOD_SYNC,
  STORE_MOD_SAVE,
} from '../../constants.ts'
import { isObject } from '../../common.ts'
import { evaluate } from '../expression.ts'

export function _data(ctx: Context, dir: DirectiveDef, _el: Element) {
  const {
    ref,
    expr,
    mods,
  } = dir

  // take the first mod as the store data type.
  const [mod = STORE_MOD_VAR] = mods

  // Create an effect that automatically re-runs when signals change
  ctx.effect(() => {
    try {
      const v = evaluate(expr, ctx) ?? {}

      if (ref) {
        addItem(ctx, ref, v)
      } else if (isObject(v)) {
        for (const k in v) {
          addItem(ctx, k, v[k])
        }
      } else {
        console.warn(`[$${ref}] invalid type`)
      }
    } catch (e) {
      console.error(`[$${ref}] `, e)
    }
  })

  function addItem(ctx: Context, ref: string, v: any) {
    switch (mod) {
      case STORE_MOD_VAR:
      case STORE_MOD_CALC:
      case STORE_MOD_SYNC:
      case STORE_MOD_SAVE:
        ctx[mod](ref, v)
    }
  }
}
