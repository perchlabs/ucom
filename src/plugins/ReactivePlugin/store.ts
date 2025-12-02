import type {
  ContextableElement,
  // SignalPair,
  SignalRecord,
  ProxyRef,
  ProxyRefRecord,
  ProxyRecord,
  ProxyStore,
  // Callback,
  // EffectFunc,
} from './types.ts'
import { signal } from './alien-signals'

export function makeProxyRef(key: string, value: any): ProxyRef {
  const ref: ProxyRef = {key}
  if (typeof value === 'function') {
    ref.func = value
  } else {
    ref.item = signal(value)
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

  for (const {key, func, item} of Object.values(refs)) {
    if (func) {
      proxy[key] = func.bind(el)
    } else if (item) {
      signals[key] = item

      // const [get, set] = item
      Object.defineProperty(proxy, key, {
        get() { return item() },
        set(val) { item(val) },
        enumerable: true
      })
    }
  }

  return [proxy, signals]
}
