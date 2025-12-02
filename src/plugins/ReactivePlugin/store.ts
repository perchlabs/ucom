import type {
  ContextableElement,
  SignalRecord,
  ProxyRef,
  ProxyRefRecord,
  ProxyRecord,
  ProxyStore,
  ProxyItemFunc,
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

  addRef({key, type, item}: ProxyRef) {
    const {data, signals} = this

    if (key in data) {
      return console.error(`Element store already has a key '${key}'.`, this.#el)
    }

    if (type === 'func') {
      data[key] = item.bind(this.#el)
    } else {
      Object.defineProperty(data, key, {
        get() { return item() },
        set(val) { item(val) },
        enumerable: true
      })
      signals[key] = item
    }
  }
}

export function proxyRef(key: string, value: any): ProxyRef {
  if (typeof value === 'function') {
    return functionRef(key, value)
  } else {
    return signalRef(key, value)
  }
}

export function functionRef(key: string, value: ProxyItemFunc): ProxyRef {
  return {
    key,
    type: 'func',
    item: value,
  }
}

export function signalRef(key: string, value: ProxyItemFunc): ProxyRef {
  return {
    key,
    type: 'signal',
    item: createSignal(value),
  }
}

export function computedRef(store: Store, key: string, value: ComputedFunctionMaker): ProxyRef {
  return {
    key,
    type: 'signal',
    item: computed(() => value(store.data)),
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
      return persistMap[storeId] = functionRef(key, value)
    }

    const getItem = () => {
      const json = localStorage.getItem(storeId)
      return json ? JSON.parse(json) : undefined
    }

    const {item} = persistMap[storeId] = signalRef(key, getItem() ?? value)
    if (item) {
      const setItem = () => localStorage.setItem(storeId, JSON.stringify(item()))
      effect(() => setItem())
    }
  }
  return persistMap[storeId]
}
