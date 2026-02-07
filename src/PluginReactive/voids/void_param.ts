// import type { ParamModKey } from '../../types.ts'
import type { Context} from '../types.ts'
import {
  // PARAM_MOD_PROP,
  PARAM_MOD_COMP,
  // PARAM_MOD_SYNC,
  // PARAM_MOD_SAVE,
  // PARAM_TOP_MODS,
} from '../../constants.ts'
import { effect, signal, computed } from '../alien-signals'
import { parseParam } from '../utils.ts'
import { defineSignalProperty } from '../store.ts'
import { evaluate } from '../expression.ts'

export function void_param(ctx: Context, el: HTMLParamElement) {
  const {data} = ctx

  const paramVarDefs = parseParam(el)
  const next = el.nextSibling
  el.remove()

  for (const paramVar of Object.values(paramVarDefs)) {
    let {k, expr, mod} = paramVar

    const comp = mod === PARAM_MOD_COMP

    // if (comp) {
    //   expr = `() => ${expr}`
    // }
  
    // Create an effect that automatically re-runs when signals change
    const dispose = effect(() => {
      try {
        const v = evaluate(expr, ctx.data) ?? {}
        if (k in data) {
          data[k] = v
        } else if (comp) {
          defineSignalProperty(data, k, computed(v))
        } else {
          defineSignalProperty(data, k, signal(v))
        }
      } catch (e) {
        console.error('[param] Error: ', e)
      }
    })
  
    // Track effect disposal
    ctx.cleanup.push(dispose)
  }

  return next
}
