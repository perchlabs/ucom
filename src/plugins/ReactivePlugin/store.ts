import type {
  ContextableElement,
  SignalRecord,
  ProxyRef,
  ProxyRefRecord,
  ProxyRecord,
  ProxyStore,
  ComputedFunction,
  ComputedFunctionMaker,
} from './types.ts'
import { computed, effect, signal as createSignal } from './alien-signals'

const persistMap: ProxyRefRecord = {}
const syncMap: ProxyRefRecord = {}

type StoreRawRecord = Record<string, any>

export class Store implements ProxyStore {
  #el: ContextableElement
  data: ProxyRecord = {}
  signals: SignalRecord = {}

  constructor(el: ContextableElement, raw: StoreRawRecord = {}) {
    this.#el = el
    this.addRawRecord(raw)
  }

  addRawRecord(raw: StoreRawRecord) {
    for (const [k, v] of Object.entries(raw)) {
      this.addRef(proxyRef(k, v))
    }
  }

  add(key: string, val: any) {
    this.addRef(proxyRef(key, val))
  }

  addRef({key, func, signal}: ProxyRef) {
    const {data, signals} = this

    if (key in data) {
      return console.error(`Element store already has a key '${key}'.`, this.#el)
    }

    if (func) {
      data[key] = func.bind(this.#el)
    } else if (signal) {
      Object.defineProperty(data, key, {
        get() { return signal() },
        set(val) { signal(val) },
        enumerable: true
      })
      signals[key] = signal
    }
  }
}

export function proxyRef(key: string, value: any): ProxyRef {
  const ref: ProxyRef = {key}
  if (typeof value === 'function') {
    ref.func = value
  } else {
    ref.signal = createSignal(value)
  }
  return ref
}

export function computedRef(store: Store, key: string, value: ComputedFunctionMaker): ProxyRef {
  return {
    key,
    signal: computed(() => value(store.data)),
  }
}

export function syncRef(name: string, key: string, value: any) {
  const storeId = `${name}-${key}`
  if (!(storeId in syncMap)) {
    syncMap[storeId] = proxyRef(key, value)
  }
  return syncMap[storeId]
}

export function persistRef(name: string, key: string, value: any) {
  const storeId = `${name}-${key}`
  if (!(storeId in persistMap)) {
    if (typeof value === 'function') {
      return persistMap[storeId] = proxyRef(key, value)
    }

    const getItem = () => {
      const json = localStorage.getItem(storeId)
      return json ? JSON.parse(json) : undefined
    }

    const {signal} = persistMap[storeId] = proxyRef(key, getItem() ?? value)
    if (signal) {
      const setItem = () => localStorage.setItem(storeId, JSON.stringify(signal()))
      effect(() => setItem())
    }
  }
  return persistMap[storeId]
}
