import type { Context, DirectiveDef } from '../types.ts'
import { effect, signal as createSignal } from '../alien-signals'
import { evaluate } from '../expression.ts'

export function _data(ctx: Context, el: HTMLElement, dir: DirectiveDef) {
  let {
    value: expr
  } = dir

  if (el.tagName !== 'META') {
    console.warn('u-data only works on meta elements')
    return
  }
  
  const next = el.nextSibling
  el.remove()

  expr = expr.trim()
  if (!expr.startsWith('{')) {
    expr = `{${expr}}`
  }

  // Create an effect that automatically re-runs when signals change
  const dispose = effect(() => {
    try {
      const data = evaluate(ctx, expr) ?? {}
      for (const k in data) {
        if (k in ctx.data) {
          ctx.data[k] = data[k]
        } else {
          const value = createSignal(data[k])
          Object.defineProperty(ctx.data, k, {
            get() { return value() },
            set(val) { value(val) },
            enumerable: true
          })
        }
      }
    } catch (e) {
      console.error('[u-text] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)

  return next
}
