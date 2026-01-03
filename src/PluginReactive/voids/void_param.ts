import type { Context } from '../types.ts'
import { $attrBool } from '../../common.ts'
import { effect, signal, computed } from '../alien-signals'
import { defineSignalProperty } from '../store.ts'
import { evaluate } from '../expression.ts'


const COMPUTED = 'computed'

export function void_param(ctx: Context, el: HTMLParamElement) {
  const {data} = ctx

  // const isTopLevel = el.parentNode instanceof ShadowRoot
  const isComputed = $attrBool(el, COMPUTED)

  const next = el.nextSibling
  el.remove()

  const title = Array.from(el.attributes).find(attr => attr.name.startsWith('$'))
  if (!title) {
    console.warn('param: no name given')
    return next
  }

  let {name, value: expr} = title
  const k = name.slice(1)

  if (isComputed) {
    expr = `() => ${expr}`
  }

  // Create an effect that automatically re-runs when signals change
  const dispose = effect(() => {
    try {
      const v = evaluate(expr, ctx) ?? {}
      if (k in data) {
        data[k] = v
      } else if (isComputed) {
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

  return next
}
