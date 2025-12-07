import type {
  RootContext,
  Context,
  ContextableNode,
  Store,
  RefRecord,
} from './types.ts'

export const globalRefs: RefRecord = {}

const contexts = new WeakMap<ContextableNode, Context>()

// Create the root context object that gets passed to all directives.
// The data property here is all reactive data because it comes directly
// from the proxy store.
export function createContext(el: ShadowRoot, {data}: Store) {
  const ctx: RootContext = {
    el,
    data,
    refs: {},
    cleanup: [],
  }
  contexts.set(el, ctx)
  return ctx
}

// Create a sub context for sub blocks.
// The data parameter here is not reactive.  It is mixed in with reactive data from
// the root context.
export function createScopedContext(el: ContextableNode, ctx: Context, data: Record<string, any>): Context {
  const subctx = {
    el,
    data: {
      ...ctx.data,
      ...data,
    },
    refs: {...ctx.refs},
    cleanup: [],
  }
  contexts.set(el, subctx)
  return subctx
}

export function cleanup(el: ContextableNode) {
  const ctx = contexts.get(el)
  if (!ctx) return
  
  // Run all cleanup functions
  ctx.cleanup?.forEach(fn => fn())
  
  // Remove context (and cleanup array) from WeakMap
  contexts.delete(el)
}
