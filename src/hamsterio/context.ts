import type {
  Context,
  Contextable,
  SignalRecord,
  ProxyRecord,
  ProxyStore,
  // SignalPair,
  Ref,
  RefRecord
} from './types.ts'
import { createSignal } from './signal.js'

export const contexts = new WeakMap<Contextable, Context>()

export function mkref(key: string, value: any): Ref {
  const ref: Ref = {key}
  if (typeof value === 'function') {
    ref.func = value
  } else {
    ref.pair = createSignal(value)
  }
  return ref
}

export function createRefRecord(data: Record<string, any>) {
  const refs: RefRecord = {}
  for (const [key, value] of Object.entries(data)) {
    refs[key] = mkref(key, value)
  }
  return refs
}

export function createProxyStoreFromRefRecord(el: Contextable, refs: RefRecord): ProxyStore {
  const proxy: ProxyRecord = {}
  const signals: SignalRecord = {}

  for (const {key, func, pair} of Object.values(refs)) {
    if (func) {
      // proxy[key] = func.bind(proxy)
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


// export function createProxyStore(data: Record<string, any>, mergeStores: ProxyStore[] = []): ProxyStore {
//   // Create signals for each property to every property automatically reactive
//   const proxy: ProxyRecord = {}
//   const signals: SignalRecord = {}

//   for (const [key, value] of Object.entries(data)) {
//     // Check if value is function
//     if (typeof value === 'function') {
//       // Store function as is binding to context
//       proxy[key] = value.bind(proxy)

//       // Store method metadata, not bound function
//       // signals[key] = { type: 'function', fn: value }
//     } else {
//       const [get, set] = createSignal(value)
//       if (signals) {
//         signals[key] = [get, set]
//       }

//       // Create proxy property that reads/writes to the signal
//       // context.data.count++ actually calls set(get() + 1)
//       Object.defineProperty(proxy, key, {
//         get() { return get() },
//         set(val) { set(val) },
//         enumerable: true
//       })
//     }

//     // console.log('createProxyStore: ', key, value)
// //     addProxyItem(key, value, proxy, signals)
//   }

//   for (const [mergeProxies, mergeSignals] of mergeStores) {
// // console.log('createProxyStore: ',   mergeProxies, mergeSignals)
//     for (const [k, v] of Object.entries(mergeProxies)) {
//       proxy[k] = v
//     }
//     for (const [k, v] of Object.entries(mergeSignals)) {
//       signals[k] = v
//     }
//   }

//   return [proxy, signals]
// }

export function createContext(el: Contextable, [data, signals]: ProxyStore) {
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

export function getContext(el: Contextable) {
  const ctx = contexts.get(el)
  if (ctx !== undefined) {
    return ctx
  }

  // Otherwise, inherit from parent
  let parent: Contextable = el.parentElement ?? el.getRootNode() as ShadowRoot
  while (parent) {
    const ctx = contexts.get(parent)
    if (ctx !== undefined) {
      return ctx
    }
    parent = parent.parentElement ?? parent.getRootNode() as ShadowRoot
  }

  return null
}
