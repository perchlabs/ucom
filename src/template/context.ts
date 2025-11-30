import type {
  Context,
  ContextableElement,
  SignalRecord,
  ProxyRecord,
  ProxyStore,
  ProxyRef,
  ProxyRefRecord,
  RefRecord,
} from './types.ts'
import { createSignal } from './signal.js'

export const contexts = new WeakMap<ContextableElement, Context>()
export const globalRefs: RefRecord = {}

export function makeProxyRef(key: string, value: any): ProxyRef {
  const ref: ProxyRef = {key}
  if (typeof value === 'function') {
    ref.func = value
  } else {
    ref.pair = createSignal(value)
  }
  return ref
}

export function createProxyRefs(data: Record<string, any>) {
  const refs: ProxyRefRecord = {}
  for (const [key, value] of Object.entries(data)) {
    refs[key] = makeProxyRef(key, value)
  }
  return refs
}

export function createProxyStore(el: ContextableElement, refs: ProxyRefRecord): ProxyStore {
  const proxy: ProxyRecord = {}
  const signals: SignalRecord = {}

  for (const {key, func, pair} of Object.values(refs)) {
    if (func) {
      proxy[key] = func.bind(el)
    } else if (pair) {
      signals[key] = pair

      const [get, set] = pair
      Object.defineProperty(proxy, key, {
        get() { return get() },
        set(val) { set(val) },
        enumerable: true
      })
    }
  }

  return [proxy, signals]
}

export function createContext(el: ContextableElement, [data, signals]: ProxyStore) {
  // Create the context object that gets passed to all directives
  const ctx: Context = {
    el, // The element itself
    data, // Reactive data proxy
    signals, // Raw signals (for advanced use)
    refs: {},
    cleanup: [], // Cleanup functions
  }

  contexts.set(el, ctx)

  return ctx
}

export function createSubContext(ctx: Context, el: ContextableElement, data: Record<string, any>): Context {
  return {
    el,
    data: {
      ...ctx.data,
      ...data,
    },
    refs: {...ctx.refs},
    cleanup: [],
  }
}