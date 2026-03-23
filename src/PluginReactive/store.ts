import type {
  ComputedFunction,
  ProxyRecord,
  Store,
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

export function createStore(el: HTMLElement): Store {
  const name = el.tagName
  const data: ProxyRecord = {}

  const addItem = ([key, value, isFunc = false]: Item) => {
    if (isFunc) {
      data[key] = value.bind(el)
    } else {
      Object.defineProperty(data, key, {
        get() { return value() },
        set(val) { value(val) },
        configurable: true,
        enumerable: true,
      })
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
    data,
    varRaw: (raw: Record<string, any>) => Object.entries(raw).forEach(([k, v]) => add(k, v)),
    var: add,

    calc(key: string, value: ComputedFunction) {
      addItem([
        key,
        computed(value),
      ])
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

    copy(dataNew: ProxyRecord = {}) {
      const store = createStore(el)
      Object.assign(store.data, Object.create(data))
      store.varRaw(dataNew)
      return store
    },
  }
}
