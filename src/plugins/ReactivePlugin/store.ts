import type {
  ContextableElement,
  ComputedFunctionMaker,
  ProxyRecord,
  SignalRecord,
} from './types.ts'
import { computed, effect, signal as createSignal } from './alien-signals'

type Item = [
  key: string,
  value: (...args: any[]) => any,
  isFunc?: boolean,
]
type ItemRecord = Record<string, Item>

const persistMap: ItemRecord = {}
const syncMap: ItemRecord = {}

export function createStore(el: ContextableElement, name: string) {
  const data: ProxyRecord = {}
  const signals: SignalRecord = {}

  const addItem = ([key, value, isFunc = false]: Item) => {
    if (key in data) {
      return console.error(`Element store already has a key '${key}'.`, el)
    }

    if (isFunc) {
      data[key] = value.bind(el)
    } else {
      Object.defineProperty(data, key, {
        get() { return value() },
        set(val) { value(val) },
        enumerable: true
      })
      signals[key] = value
    }
  }

  const add = (key: string, val: any) => addItem(simpleItem(key, val))

  const simpleItem = (key: string, value: any): Item => {
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
    addRaw: (raw: Record<string, any>) => Object.entries(raw).forEach(([k, v]) => add(k, v)),

    computed(key: string, value: ComputedFunctionMaker) {
      addItem([
        key,
        computed(() => value(data)),
      ])
    },

    sync(key: string, value: any) {
      const storeId = `${name}-${key}`
      if (!(storeId in syncMap)) {
        syncMap[storeId] = simpleItem(key, value)
      }
      addItem(syncMap[storeId])
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
  
          const [,signal] = persistMap[storeId] = simpleItem(key, getItem() ?? value)
          if (signal) {
            const setItem = () => localStorage.setItem(storeId, JSON.stringify(signal()))
            effect(() => setItem())
          }
        }
      }

      addItem(persistMap[storeId])
    },
  }
}

