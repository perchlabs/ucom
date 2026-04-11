import type {
  ComponentManager,
} from '../types.ts'
import type {
  Context,
  ContextableNode,
  RefRecord,
  ProxyRecord,
  ComputedFunction,
} from './types.ts'
import {
  computed as createComputed,
  effect as createEffect,
  signal as createSignal,
} from './alien-signals'
import { isFunction, cloneTemplateContent } from '../common.ts'
import { walk, walkChildren } from './walk.ts'
import { getParent } from './utils.ts'

interface Frag {
  start: Text
  end: Text
}

type StoreItem = [
  key: string,
  value: (...args: any[]) => any,
  isFunc?: boolean,
]
type StoreItemRecord = Record<string, StoreItem>

const persistMap: StoreItemRecord = {}
const syncMap: StoreItemRecord = {}

export const globalRefs: RefRecord = {}

export function createContext(
  man: ComponentManager,
  customEl: HTMLElement,
  ptr: ContextableNode,

  dataRaw: ProxyRecord = {},
  dataParent: ProxyRecord = {},

  refs: RefRecord = {},
): Context {
  const frag: Frag | null = ptr instanceof HTMLTemplateElement
    ? {start: new Text, end: new Text}
    : null
  const tpl: ContextableNode = frag ? cloneTemplateContent(ptr as HTMLTemplateElement)
    : ptr instanceof ShadowRoot ? ptr
    : ptr.cloneNode(true) as HTMLElement

  let initialized = false
  const children = new Set<Context>()

  const storeName = customEl.tagName
  const data: ProxyRecord = {}
  const proxy = createFallbackProxy(data, dataParent)

  const ctx: Context = {
    man,
    refs,
    cleanup: [],

    get start() {
      return frag?.start ?? ctx.walkable
    },

    get walkable() {
      return tpl
    },

    get data() {
      return proxy
    },

    scope(ptr: HTMLElement, dataNew: ProxyRecord = {}) {
      const scoped = createContext(
        man,
        customEl,
        ptr,

        dataNew,
        proxy,

        {...refs},
      )
      children.add(scoped)

      return scoped
    },

    mount(parent: ContextableNode, anchor: Node) {
      if (frag) {
        const {start, end} = frag

        if (initialized) {
          let node: Node | null = start!
          let next: Node | null
          while (node) {
            next = node.nextSibling
            parent.insertBefore(node, anchor)
            if (node === end) {
              break
            }
            node = next
          }
        } else {
          walkChildren(ctx)
          parent.insertBefore(end, anchor!)
          parent.insertBefore(start, end)
          parent.insertBefore(ctx.walkable, end)
        }
      } else {
        if (!initialized) {
          walk(ctx, ctx.walkable as HTMLElement)
        }

        parent.insertBefore(ctx.walkable, anchor)
      }
    },

    remove() {
      if (frag) {
        if (ctx.start) {
          const parent = getParent(ctx.start)
          if (!parent) {
            return
          }

          let node: Node | null = ctx.start
          let next: Node | null
          while (node) {
            next = node.nextSibling
            parent.removeChild(node)
            if (node === frag.end) {
              break
            }
            node = next
          }
        }
      } else {
        (ctx.walkable as HTMLElement)?.remove()
      }
    },

    teardown() {
      children.forEach(child => child.teardown())
      ctx.remove()
      ctx.cleanup.forEach(fn => fn())
    },

    varRaw: (raw: Record<string, any>) => Object.entries(raw).forEach(([k, v]) => ctx.var(k, v)),

    var: (key: string, val: any) => addItem(simpleItem(key, val)),

    calc(key: string, value: ComputedFunction) {
      addItem([key, createComputed(value)])
    },

    sync(key: string, value: any) {
      const keyId = `${storeName}-${key}`
      if (!(keyId in syncMap)) {
        syncMap[keyId] = simpleItem(key, value)
      }
      addItem(syncMap[keyId])
    },

    save(key: string, value: any) {
      const keyId = `${storeName}-${key}`
      if (!(keyId in persistMap)) {
        if (isFunction(value)) {
          persistMap[keyId] = [key, value, true]
        } else {
          const getItem = () => {
            const json = localStorage.getItem(keyId)
            return json ? JSON.parse(json) : undefined
          }
  
          const [,signal] = persistMap[keyId] = simpleItem(key, getItem() ?? value)
          if (signal) {
            const setItem = () => localStorage.setItem(keyId, JSON.stringify(signal()))
            ctx.cleanup.push(createEffect(() => setItem()))
          }
        }
      }

      addItem(persistMap[keyId])
    },
  }

  function addItem(item: StoreItem) {
    const [key, value, isFunc = false] = item

    if (isFunc) {
      data[key] = value.bind(customEl)
    } else {
      Object.defineProperty(data, key, {
        get() { return value() },
        set(val) { value(val) },
        enumerable: true,
      })
    }
  }

  ctx.varRaw(dataRaw)
  return ctx
}

function createFallbackProxy(data: ProxyRecord, parent: ProxyRecord = {}) {
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
