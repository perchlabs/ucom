import type {
  Context,
  // ContextableNode,
  DirectiveDef,
} from '../types.ts'
import {
  STORE_MOD_VAR,
  STORE_MOD_CALC,
  STORE_MOD_SYNC,
  STORE_MOD_SAVE,
} from '../../constants.ts'
import { isRecord } from '../../common.ts'
import { effect } from '../alien-signals'
import { evaluate } from '../expression.ts'

export function _data(ctx: Context, dir: DirectiveDef, _el: HTMLElement) {
  const {
    ref,
    expr,
    mod = STORE_MOD_VAR,
  } = dir

  // Create an effect that automatically re-runs when signals change
  const dispose = effect(() => {
    try {
      const v = evaluate(expr, ctx) ?? {}

      if (ref) {
        addItem(ctx, ref, v)
      } else if (isRecord(v)) {
        for (const k in v) {
          addItem(ctx, k, v[k])
        }
      } else {
        console.error('$data invalid format')
      }
    } catch (e) {
      console.error('$data: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)

  function addItem({store}: Context, ref: string, v: any) {
    switch (mod) {
      case STORE_MOD_VAR:
      case STORE_MOD_CALC:
      case STORE_MOD_SYNC:
      case STORE_MOD_SAVE:
        store[mod](ref, v)
    }
  }
}
