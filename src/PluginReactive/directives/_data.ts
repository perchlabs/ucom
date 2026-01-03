import type { Context, DirectiveDef } from '../types.ts'
import { effect, signal as createSignal } from '../alien-signals'
import { defineSignalProperty } from '../store.ts'
import { evaluate } from '../expression.ts'

export function _data(ctx: Context, el: HTMLElement, dir: DirectiveDef) {
  const {data} = ctx
  let {value: expr} = dir

  expr = expr.trim()
  if (!expr) {
    return console.warn(`[u-data] expression cannot be empty.`)
  }

  if (el.tagName !== 'META') {
    console.error('[u-data] directive only allowed on meta elements')
    return
  }
  
  const next = el.nextSibling
  el.remove()

  if (!expr.startsWith('{')) {
    expr = `{${expr}}`
  }

  // Create an effect that automatically re-runs when signals change
  const dispose = effect(() => {
    try {
      const dataNew = evaluate(ctx, expr) ?? {}
      for (const k in dataNew) {
        if (k in data) {
          data[k] = dataNew[k]
        } else {
          defineSignalProperty(data, k, createSignal(dataNew[k]))
        }
      }
    } catch (e) {
      console.error('[u-data] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)

  return next
}
