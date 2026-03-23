import type {
  ComponentManager,
} from '../types.ts'
import type {
  Store,
  Context as iContext,
  ContextableNode,
  RefRecord,
  ProxyRecord,
} from './types.ts'
import { walk } from './walk.ts'

export const globalRefs: RefRecord = {}

export function createContext(
  ptr: ContextableNode,
  man: ComponentManager,
  store: Store,
  refs: RefRecord = {},
): iContext {
  let isFrag: boolean
  let start: Text | undefined
  let end: Text | undefined
  let children = new Set<iContext>()

  const ctx: iContext = {
    ptr,
    man,
    store,
    refs,
    cleanup: [],

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
      isFrag = ptr instanceof HTMLTemplateElement
      ctx.dup = isFrag
        ? (ptr as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment
        : ptr.cloneNode(true) as HTMLElement

      ctx.insert(parent, anchor)
      ctx.walk()
      return ctx
    },

    insert(parent: ContextableNode, anchor: Node) {
      if (isFrag) {
        if (start) {
          // already inserted, moving
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
          start = new Text('')
          end = new Text('')
          parent.insertBefore(end, anchor)
          parent.insertBefore(start, end)
          parent.insertBefore(ctx.dup!, end)
        }
      } else {
        parent.insertBefore(ctx.dup!, anchor)
      }
    },

    remove() {
      if (start) {
        const parent = start.parentNode!
        let node: Node | null = start
        let next: Node | null
        while (node) {
          next = node.nextSibling
          parent.removeChild(node)
          if (node === end) {
            break
          }
          node = next
        }
      } else {
        ptr.parentNode?.removeChild(ptr)
      }

      ctx.teardown()
    },

    teardown() {
      ctx.cleanup.forEach(fn => fn())
      children.forEach(child => child.teardown())
    },

    walk() {
      walk(ctx.dup ?? ptr, ctx)
    },
  }

  return ctx
}
