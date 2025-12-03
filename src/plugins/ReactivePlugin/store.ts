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

export function createStore(el: ContextableElement, raw: StoreRawRecord = {}) {
  const data: ProxyRecord = {}
  const signals: SignalRecord = {}

  const addRef = ({key, type, item}: ProxyRef) => {
    if (key in data) {
      return console.error(`Element store already has a key '${key}'.`, el)
    }

    if (type === 'func') {
      data[key] = item.bind(el)
    } else {
      Object.defineProperty(data, key, {
        get() { return item() },
        set(val) { item(val) },
        enumerable: true
      })
      signals[key] = item
    }
  }

  Object.entries(raw).forEach(([k, v]) => addRef(proxyRef(k, v)))

  return {
    add: (key: string, val: any) => addRef(proxyRef(key, val)),
    addRef,
    signals,
    data,
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

export function computedRef(store: ProxyStore, key: string, value: ComputedFunctionMaker): ProxyRef {
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
