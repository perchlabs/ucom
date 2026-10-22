import type {
  ComponentManager,
} from '../reference.ts'
import {
  SYS_CODE,
} from '../reference.ts'
import type {
  Context,
  ContextableNode,
  DataRecord,
  StoreAdderEntry,
} from './reference.ts'
import {
  STORE_MOD_VAR,
  STORE_MOD_CALC,
  STORE_MOD_SYNC,
  STORE_MOD_SAVE,
} from './reference.ts'
import {
  computed as createComputed,
  effect as createEffect,
  signal as createSignal,
} from './alien-signals'
import {
  isSymbol,
  isAsyncFunction,
  isFunction,
  isShadowRoot,
  isTemplateElement,
  ArrayFrom,
  ObjectKeys,
  ObjectDefineProperty,
  safeNodeName,
  uniqueArr,
  cloneTemplateContent,
  deleteRange,
} from '../common.ts'
import { evaluate } from './expression.ts'
import { walk, walkChildren } from './walk.ts'

interface Frag {
  start: Text
  end: Text
}

const STORE_ITEM_TYPE_SYMBOL = 'symbol'
const STORE_ITEM_TYPE_FUNCTION = 'function'
const STORE_ITEM_TYPE_SIGNAL = 'signal'
const STORE_ITEM_TYPE_COMPUTED = 'computed'

type StoreItemType = typeof STORE_ITEM_TYPE_SYMBOL | typeof STORE_ITEM_TYPE_FUNCTION | typeof STORE_ITEM_TYPE_SIGNAL | typeof STORE_ITEM_TYPE_COMPUTED

type StoreItem = [
  camel: string | symbol,
  value: (...args: any[]) => any,
  type: StoreItemType,
]
type StoreItemRecord = Record<string, StoreItem>

const syncMap: StoreItemRecord = {}

export const createContext = (
  man: ComponentManager,
  host: HTMLElement,
  ptr: ContextableNode,

  dataRaw: DataRecord = {},
  dataParent: DataRecord = {},
  teardownCallback: () => void = () => {},

): Context => {
  const frag: Frag | null = isTemplateElement(ptr)
    ? {start: new Text, end: new Text}
    : null
  const walkable: ContextableNode = frag
    ? cloneTemplateContent(ptr as HTMLTemplateElement)
    : isShadowRoot(ptr)
      ? ptr
      : ptr.cloneNode(true) as Element

  let mounted = false
  const children = new Set<Context>()

  const storeName = `${SYS_CODE}-${safeNodeName(host)}`
  const data: DataRecord = {}
  const proxy = createFallbackProxy(data, dataParent)
  const cleanup: (() => void)[] = []

  const ctx: Context = {
    man,
    ptr,

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
      )
      children.add(scoped)

      return scoped
    },

    mount(parent: ContextableNode, anchor: Node) {
      if (frag) {
        const {start, end} = frag
        if (mounted) {
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
        if (!mounted) {
          walk(ctx, walkable as Element)
        }

        parent.insertBefore(walkable, anchor)
      }

      mounted = true

      return ctx
    },

    teardown() {
      ArrayFrom(children).forEach(child => child.teardown())
      cleanup.forEach(fn => fn())
      teardownCallback()

      if (!mounted) {
        return
      }

      if (frag) {
        // if (!contextableParent(frag.start)) {
        //   console.warn('DEBUG frag.start does not have a parent')
        //   return
        // }

        deleteRange(frag.start, frag.end, true)

        // const range = new Range
        // range.setStartBefore(frag.start)
        // range.setEndAfter(frag.end)
        // range.deleteContents()
      } else {
        ;(walkable as Element).remove?.()
      }
    },

    effect(fn, cleanup?) {
      setTimeout(() => {
        type EffectFuncNonAsync = (() => void) | (() => (() => void))

        const fnFix: EffectFuncNonAsync = isAsyncFunction(fn)
          ? () => { fn() } 
          : fn as EffectFuncNonAsync

        ctx.push(createEffect(fnFix))
        if (cleanup) {
          ctx.push(cleanup)
        }
      })
    },

    push(fn: () => void) {
      cleanup.push(fn)
    },

    eval(exp: string | symbol, data?: DataRecord | null): unknown {
      return isSymbol(exp)
        ? ctx.data[exp]
        : evaluate(exp, ctx.data, data ?? {})
    },

    [STORE_MOD_VAR](entry) {
      addItem(createSimpleItem(entry))
    },

    [STORE_MOD_CALC](entry) {
      addItem(createComputedItem(entry))
    },

    [STORE_MOD_SYNC]([camel, value]) {
      if (isSymbol(camel)) {
        return
      }

      const keyId = `${storeName}-${camel}`
      syncMap[keyId] ??= createSimpleItem([camel, value])
      addItem(syncMap[keyId])
    },

    [STORE_MOD_SAVE]([camel, value]) {
      if (isSymbol(camel)) {
        return
      }

      const persistItem = (): StoreItem => {
        if (isFunction(value)) {
          return [camel, value, STORE_ITEM_TYPE_FUNCTION]
        }

        const json = localStorage.getItem(keyId)
        const signal = createSignal(json ? JSON.parse(json) : value)
        // This effect should not be cleaned up with the context.
        createEffect(() => {
          localStorage.setItem(keyId, JSON.stringify(signal()))
        })

        return [camel, signal, STORE_ITEM_TYPE_SIGNAL]
      }

      const keyId = `${storeName}-${camel}`
      syncMap[keyId] ??= persistItem()
      addItem(syncMap[keyId])
    },
  }

  const addItem = ([camel, val, type]: StoreItem) => {
    switch (type) {
      case STORE_ITEM_TYPE_SYMBOL:
      case STORE_ITEM_TYPE_FUNCTION:
        data[camel] = val
        break
      case STORE_ITEM_TYPE_SIGNAL:
      case STORE_ITEM_TYPE_COMPUTED:
        ObjectDefineProperty(data, camel, {
          get() { return val() },
          set(valNew) { val(valNew) },
          enumerable: true,
        })
    }
  }

  const createSymbolItem = (entry: StoreAdderEntry): StoreItem =>
    [...entry, STORE_ITEM_TYPE_SYMBOL]

  const createFunctionItem = ([key, val]: StoreAdderEntry): StoreItem =>
    [key, val.bind(host), STORE_ITEM_TYPE_FUNCTION]

  const createSignalItem = ([key, val]: StoreAdderEntry): StoreItem =>
    [key, createSignal(val), STORE_ITEM_TYPE_SIGNAL]

  const createComputedItem = ([key, val]: StoreAdderEntry): StoreItem =>
    [key, createComputed(val), STORE_ITEM_TYPE_SIGNAL]

  const createSimpleItem = (entry: StoreAdderEntry): StoreItem => {
    const [, val] = entry
    return isSymbol(val) ? createSymbolItem(entry) : 
      isFunction(val) ? createFunctionItem(entry) :
      createSignalItem(entry)
  }

  Reflect.ownKeys(dataRaw).forEach((key => addItem(createSimpleItem([key, dataRaw[key]]))))

  return ctx
}

const createFallbackProxy = (data: DataRecord, parent: DataRecord) =>
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
      return data[camel] ?? parent[camel]
    },
    set(_target, camel, val) {
      if (camel in data) {
        return Reflect.set(data, camel, val)
      }
      if (camel in parent) {
        return Reflect.set(parent, camel, val)
      }

      console.warn(`Property '${String(camel)}' undefined`)

      return false
    },
  })
