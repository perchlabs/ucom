import type {
  ComponentManager,
} from '../types.ts'
import type {
  Store,
  Context,
  ContextableNode,
  RefRecord,
  ProxyRecord,
} from './types.ts'
import { walk, walkChildren } from './walk.ts'
import { getParent } from './utils.ts'

export const globalRefs: RefRecord = {}

export function createContext(
  ptr: ContextableNode,
  man: ComponentManager,
  store: Store,
  refs: RefRecord = {},
): Context {
  let initialized = false
  let isFrag: boolean = false
  let start: Text | undefined
  let end: Text | undefined
  let children = new Set<Context>()

  let tpl: ContextableNode

  if (ptr.nodeType === 1) {
    tpl = (isFrag = ptr instanceof HTMLTemplateElement)
      ? (ptr.content).cloneNode(true) as DocumentFragment
      : ptr.cloneNode(true) as HTMLElement
  } else if (ptr instanceof ShadowRoot) {
    tpl = ptr
  } else {
    throw new Error('Invalid ContextableNode')
  }

  const ctx: Context = {
    man,
    store,
    refs,
    cleanup: [],

    // children,

    get start() {
      return start ?? ctx.walkable
    },

    // walkable: tpl,
    get walkable() {
      return tpl
    },

    scope(el: HTMLElement, data: ProxyRecord = {}) {
      const scoped = createContext(
        el,
        man,
        store.copy(data),
        {...refs},
      )
      children.add(scoped)

      return scoped
    },

    mount(parent: ContextableNode, anchor: Node) {
      if (initialized) {
        // already inserted, moving

        if (isFrag) {
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
          parent.insertBefore(ctx.walkable, anchor)
        }
      } else {
        initialized = true

        if (isFrag) {
          walkChildren(ctx)

          start = new Text
          end = new Text
          parent.insertBefore(end, anchor!)
          parent.insertBefore(start, end)
          parent.insertBefore(ctx.walkable, end)
        } else {
          walk(ctx, ctx.walkable as HTMLElement)
          parent.insertBefore(ctx.walkable, anchor)
        }
      }
    },

    remove() {
      if (isFrag) {
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
            if (node === end) {
              break
            }
            node = next
          }
        }
      } else {
        (ctx.walkable as HTMLElement)?.remove()
      }

      ctx.teardown()
    },

    teardown() {
      ctx.cleanup.forEach(fn => fn())
      children.forEach(child => child.teardown())
      ctx.store.cleanup()
    }
  }

  return ctx
}
