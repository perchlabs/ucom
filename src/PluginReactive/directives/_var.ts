import type {
  Context,
  DirectiveDef,
  Store,
} from '../types.ts'
import {
  STORE_MOD_VAR,
  STORE_MOD_CALC,
  STORE_MOD_SYNC,
  STORE_MOD_SAVE,
} from '../../constants.ts'
import {
  isObject,
} from '../../common.ts'
import { effect } from '../alien-signals'

import { evaluate } from '../expression.ts'

export function _var(ctx: Context, _el: Element, dir: DirectiveDef) {
  // console.log('_var: ', dir)

  const {store} = ctx

  const {
    ref,
    mod = STORE_MOD_VAR,
    val: expr
  } = dir

  // Create an effect that automatically re-runs when signals change
  const dispose = effect(() => {
    try {
// console.log('var expr: ', expr)
      const v = evaluate(expr, store.data) ?? {}

      if (ref) {
        addItem(store, mod, ref, v)
      } else if (isObject(v)) {
        for (const k in v) {
          addItem(store, mod, k, v[k])
        }
      } else {
        console.warn('TODO: Error, not basic type or object.')
      }
    } catch (e) {
      console.error('[var] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}

function addItem(store: Store, mod: string, ref: string, v: any) {
  switch (mod) {
    case STORE_MOD_VAR:
      store.add(ref, v)
      break
    case STORE_MOD_CALC:
      store.computed(ref, v)
      break
    case STORE_MOD_SYNC:
      store.sync(ref, v)
      break
    case STORE_MOD_SAVE:
      store.persist(ref, v)
      break
    default:
      console.warn(`Unsupported variable type '${mod}'`)
  }
}
