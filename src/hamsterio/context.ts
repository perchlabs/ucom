import type {
  Context,
  ContextableElement,
  SignalRecord,
  ProxyRecord,
  ProxyStore,
  Ref,
  Refs
} from './types.ts'
import { createSignal } from './signal.js'

export const contexts = new WeakMap<ContextableElement, Context>()

export function mkref(key: string, value: any): Ref {
  const ref: Ref = {key}
  if (typeof value === 'function') {
    ref.func = value
  } else {
    ref.pair = createSignal(value)
  }
  return ref
}

export function createRefs(data: Record<string, any>) {
  const refs: Refs = {}
  for (const [key, value] of Object.entries(data)) {
    refs[key] = mkref(key, value)
  }
  return refs
}

export function createProxyStore(el: ContextableElement, refs: Refs): ProxyStore {
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
  const context: Context = {
    el, // The element itself
    data, // Reactive data proxy
    signals, // Raw signals (for advanced use)
    cleanup: [], // Cleanup functions
  }

  contexts.set(el, context)

  return context
}
