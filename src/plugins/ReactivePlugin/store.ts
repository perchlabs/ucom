import type {
  ContextableElement,
  SignalRecord,
  ProxyRef,
  ProxyRefRecord,
  ProxyRecord,
  ComputedFunctionMaker,
} from './types.ts'
import { computed, effect, signal as createSignal } from './alien-signals'

const persistMap: ProxyRefRecord = {}
const syncMap: ProxyRefRecord = {}

type StoreRawRecord = Record<string, any>

export function createStore(el: ContextableElement, name: string) {
  const data: ProxyRecord = {}
  const signals: SignalRecord = {}

  const addRef = ([key, item, isFunc = false]: ProxyRef) => {
    if (key in data) {
      return console.error(`Element store already has a key '${key}'.`, el)
    }

    if (isFunc) {
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

  const add = (key: string, val: any) => addRef(simpleRef(key, val))

  const simpleRef = (key: string, value: any): ProxyRef => {
    const isFunc = typeof value === 'function'
    return [
      key,
      isFunc ? value : createSignal(value),
      isFunc,
    ]
  }
  return {
    signals,
    data,
    add,
    addRaw: (raw: StoreRawRecord) => Object.entries(raw).forEach(([k, v]) => add(k, v)),

    computed(key: string, value: ComputedFunctionMaker) {
      addRef([
        key,
        computed(() => value(data)),
      ])
    },

    sync(key: string, value: any) {
      const storeId = `${name}-${key}`
      if (!(storeId in syncMap)) {
        syncMap[storeId] = simpleRef(key, value)
      }
      addRef(syncMap[storeId])
    },

    persist(key: string, value: any) {
      const storeId = `${name}-${key}`
      if (!(storeId in persistMap)) {
        if (typeof value === 'function') {
          persistMap[storeId] = [key, value, true]
        } else {
          const getItem = () => {
            const json = localStorage.getItem(storeId)
            return json ? JSON.parse(json) : undefined
          }
  
          const [,signal] = persistMap[storeId] = simpleRef(key, getItem() ?? value)
          if (signal) {
            const setItem = () => localStorage.setItem(storeId, JSON.stringify(signal()))
            effect(() => setItem())
          }
        }
      }

      addRef(persistMap[storeId])
    },
  }
}

