import type {
  ComponentManager,
} from '../types.ts'
import type {
  Context,
  ContextableNode,
  RefRecord,
  DataRecord,
  ComputedFunction,
} from './types.ts'
import {
  STORE_MOD_VAR,
  STORE_MOD_CALC,
  STORE_MOD_SYNC,
  STORE_MOD_SAVE,
} from '../constants.ts'
import {
  computed as createComputed,
  effect as createEffect,
  signal as createSignal,
} from './alien-signals'
import {
  isFunction,
  ObjectKeys,
  ObjectEntriesEach,
  ObjectDefineProperty,
  uniqueArr,
  cloneTemplateContent,
} from '../common.ts'
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

  dataRaw: DataRecord = {},
  dataParent: DataRecord = {},

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
  const data: DataRecord = {}
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

    scope(ptr: Element, dataNew: DataRecord = {}) {
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
        (ctx.walkable as HTMLElement).remove?.()
      }
    },

    effect(fn: () => void) {
      ctx.cleanup.push(createEffect(fn))
    },

    teardown() {
      children.forEach(child => child.teardown())
      ctx.remove()
      ctx.cleanup.forEach(fn => fn())
    },

    [STORE_MOD_VAR](key: string, val: any) {
      addItem(simpleItem(key, val))
    },

    [STORE_MOD_CALC](key: string, value: ComputedFunction) {
      addItem([key, createComputed(value)])
    },

    [STORE_MOD_SYNC](key: string, value: any) {
      const keyId = `${storeName}-${key}`
      if (!(keyId in syncMap)) {
        syncMap[keyId] = simpleItem(key, value)
      }
      addItem(syncMap[keyId])
    },

    [STORE_MOD_SAVE](key: string, value: any) {
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
            ctx.effect(() => localStorage.setItem(keyId, JSON.stringify(signal())))
          }
        }
      }

      addItem(persistMap[keyId])
    },
  }

  function addItem([key, value, isFunc = false]: StoreItem) {
    if (isFunc) {
      data[key] = value.bind(customEl)
    } else {
      ObjectDefineProperty(data, key, {
        get() { return value() },
        set(val) { value(val) },
        enumerable: true,
      })
    }
  }

  ObjectEntriesEach(dataRaw, e => ctx.var(...e))

  return ctx
}

function createFallbackProxy(data: DataRecord, parent: DataRecord = {}) {
  return new Proxy(data, {
    has(_target, key) {
      return key in data || key in parent
    },
    ownKeys(_target) {
      return uniqueArr(ObjectKeys(data), ObjectKeys(parent))
    },
    get(_target, key) {
      if (key === Symbol.unscopables) {
        return
      }

      return Reflect.get(data, key) ?? Reflect.get(parent, key)
    },
    // set(target, key, val) {
    //   if (!(key in target)) {
    //     console.warn(`Property '${key}' must be set on the store before updating it.`)
    //   }

    //   return Reflect.set(data, key, val)
    // },
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
