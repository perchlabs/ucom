import type {
  ComputedFunction,
  ProxyRecord,
  Store,
} from './types.ts'
import { isFunction } from '../common.ts'
import {
  computed as createComputed,
  effect as createEffect,
  signal as createSignal,
} from './alien-signals'

type StoreItem = [
  key: string,
  value: (...args: any[]) => any,
  isFunc?: boolean,
]
type StoreItemRecord = Record<string, StoreItem>

const persistMap: StoreItemRecord = {}
const syncMap: StoreItemRecord = {}

export function createStore(el: HTMLElement, dataRaw: ProxyRecord = {}, parent: ProxyRecord = {}): Store {
  const name = el.tagName

  const data: ProxyRecord = {}
  const proxy = createProxy(data, parent)
  const cleanup: (() => void)[] = []

  const store: Store = {
    get data() {
      return proxy
    },

    cleanup() {
      cleanup.forEach(f => f())
    },

    varRaw: (raw: Record<string, any>) => Object.entries(raw).forEach(([k, v]) => store.var(k, v)),
    var: (key: string, val: any) => addItem(simpleItem(key, val)),

    calc(key: string, value: ComputedFunction) {
      addItem([key, createComputed(value)])
    },

    sync(key: string, value: any) {
      const storeId = `${name}-${key}`
      if (!(storeId in syncMap)) {
        syncMap[storeId] = simpleItem(key, value)
      }
      addItem(syncMap[storeId])
    },

    save(key: string, value: any) {
      const storeId = `${name}-${key}`
      if (!(storeId in persistMap)) {
        if (isFunction(value)) {
          persistMap[storeId] = [key, value, true]
        } else {
          const getItem = () => {
            const json = localStorage.getItem(storeId)
            return json ? JSON.parse(json) : undefined
          }
  
          const [,signal] = persistMap[storeId] = simpleItem(key, getItem() ?? value)
          if (signal) {
            const setItem = () => localStorage.setItem(storeId, JSON.stringify(signal()))
            cleanup.push(createEffect(() => setItem()))
          }
        }
      }

      addItem(persistMap[storeId])
    },

    copy(dataNew: ProxyRecord = {}) {
      return createStore(el, dataNew, proxy)
    },
  }

  function addItem(item: StoreItem) {
    const [key, value, isFunc = false] = item

    if (isFunc) {
      store.data[key] = value.bind(el)
    } else {
      Object.defineProperty(store.data, key, {
        get() { return value() },
        set(val) { value(val) },
        enumerable: true,
      })
    }
  }

  store.varRaw(dataRaw)

  return store
}

function createProxy(data: ProxyRecord, parent: ProxyRecord = {}) {
  return new Proxy(data, {
    has(_target, key) {
      return Reflect.has(data, key) || Reflect.has(parent, key)
    },
    ownKeys(_target) {
      return [...new Set(...Object.keys(data), ...Object.keys(parent))]
    },
    get(_target, key) {
      if (key === Symbol.unscopables) {
        return
      }

      return Reflect.get(data, key) ?? Reflect.get(parent, key)
    },
    set(_target, key, val) {
      return Reflect.set(data, key, val)
    },
  })
}

function simpleItem(key: string, value: any): StoreItem {
  const isFunc = isFunction(value)
  return [
    key,
    isFunc ? value : createSignal(value),
    isFunc,
  ]
}
