import type {
  ComponentManager,
} from '../reference.ts'
import {
  SYS_PREFIX,
  STORE_MOD_VAR,
  STORE_MOD_CALC,
  STORE_MOD_SYNC,
  STORE_MOD_SAVE,
} from '../reference.ts'
import type {
  Context,
  ContextableNode,
  RefRecord,
  DataRecord,
  ComputedFunction,
  StoreAdderEntry,
} from './reference.ts'
import {
  computed as createComputed,
  effect as createEffect,
  signal as createSignal,
} from './alien-signals'
import {
  isFunction,
  isShadowRoot,
  isTemplateElement,
  ArrayFrom,
  ObjectKeys,
  ObjectEntriesEach,
  ObjectDefineProperty,
  safeNodeName,
  uniqueArr,
  cloneTemplateContent,
} from '../common.ts'
import { walk, walkChildren } from './walk.ts'

interface Frag {
  start: Text
  end: Text
}

type StoreItem = [
  camel: string,
  value: (...args: any[]) => any,
  isFunc?: boolean,
]
type StoreItemRecord = Record<string, StoreItem>

const syncMap: StoreItemRecord = {}

export const globalRefs: RefRecord = {}

export const createContext = (
  man: ComponentManager,
  host: HTMLElement,
  ptr: ContextableNode,

  dataRaw: DataRecord = {},
  dataParent: DataRecord = {},
  teardownCallback: () => void = () => {},

  refs: RefRecord = {},
): Context => {
  const frag: Frag | null = isTemplateElement(ptr)
    ? {start: new Text, end: new Text}
    : null
  const walkable: ContextableNode = frag
    ? cloneTemplateContent(ptr as HTMLTemplateElement)
    : isShadowRoot(ptr)
      ? ptr
      : ptr.cloneNode(true) as Element

  let initialized = false
  const children = new Set<Context>()

  const storeName = `${SYS_PREFIX}-${safeNodeName(host)}`
  const data: DataRecord = {}
  const proxy = createFallbackProxy(data, dataParent)
  const cleanup: (() => void)[] = []

  const ctx: Context = {
    man,
    refs,

    get start() {
      return frag?.start ?? walkable
    },

    get walkable() {
      return walkable
    },

    get data() {
      return proxy
    },

    scope(ptr: Element, dataNew: DataRecord = {}) {
      const scoped = createContext(
        man,
        host,
        ptr,

        dataNew,
        proxy,
        () => children.delete(scoped),

        {...refs},
      )
      children.add(scoped)

      return scoped
    },

    mount(parent: ContextableNode, anchor: Node) {
      if (frag) {
        const {start, end} = frag

        if (initialized) {
          let node: Node | null = start
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
          parent.insertBefore(end, anchor)
          parent.insertBefore(start, end)
          parent.insertBefore(walkable, end)
        }
      } else {
        if (!initialized) {
          walk(ctx, walkable as Element)
        }

        parent.insertBefore(walkable, anchor)
      }
    },

    teardown() {
      ArrayFrom(children).forEach(child => child.teardown())
      cleanup.forEach(fn => fn())
      teardownCallback()

      if (frag) {
        // if (!contextableParent(frag.start)) {
        //   console.warn('DEBUG frag.start does not have a parent')
        //   return
        // }

        const range = new Range
        range.setStartBefore(frag.start)
        range.setEndAfter(frag.end)
        range.deleteContents()
      } else {
        (walkable as Element).remove?.()
      }
    },

    effect(fn: () => void) {
      ctx.push(createEffect(fn))
    },

    push(fn: () => void) {
      cleanup.push(fn)
    },

    [STORE_MOD_VAR](entry) {
      addItem(simpleItem(entry))
    },

    [STORE_MOD_CALC]([camel, value]: [camel: string, value: ComputedFunction]) {
      addItem([camel, createComputed(value)])
    },

    [STORE_MOD_SYNC](entry) {
      const keyId = `${storeName}-${entry[0]}`
      syncMap[keyId] ??= simpleItem(entry)
      addItem(syncMap[keyId])
    },

    [STORE_MOD_SAVE]([camel, value]) {
      const persistItem = (): StoreItem => {
        if (isFunction(value)) {
          return [camel, value, true]
        }

        const json = localStorage.getItem(keyId)
        const signal = createSignal(json ? JSON.parse(json) : value)
        // This effect should not be cleaned up with the context.
        createEffect(() => {
          localStorage.setItem(keyId, JSON.stringify(signal()))
        })

        return [camel, signal]
      }

      const keyId = `${storeName}-${camel}`
      syncMap[keyId] ??= persistItem()
      addItem(syncMap[keyId])

    },
  }

  const addItem = ([camel, value, isFunc = false]: StoreItem) => {
    if (isFunc) {
      data[camel] = value.bind(host)
    } else {
      ObjectDefineProperty(data, camel, {
        get() { return value() },
        set(val) { value(val) },
        enumerable: true,
      })
    }
  }

  ObjectEntriesEach(dataRaw, ctx.var)

  return ctx
}

const createFallbackProxy = (data: DataRecord, parent: DataRecord = {}) =>
  new Proxy(data, {
    has(_target, camel) {
      return camel in data || camel in parent
    },
    ownKeys(_target) {
      return uniqueArr(ObjectKeys(data), ObjectKeys(parent))
    },
    get(_target, camel) {
      if (camel === Symbol.unscopables) {
        return
      }

      return Reflect.get(data, camel) ?? Reflect.get(parent, camel)
    },
    // set(target, camel, val) {
    //   if (!(camel in target)) {
    //     console.warn(`Property '${camel}' must be set on the store before updating it.`)
    //   }

    //   return Reflect.set(data, camel, val)
    // },
  })

const simpleItem = ([camel, value]: StoreAdderEntry): StoreItem => {
  const isFunc = isFunction(value)
  return [
    camel,
    isFunc ? value : createSignal(value),
    isFunc,
  ]
}

