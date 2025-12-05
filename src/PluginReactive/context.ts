import type {
  RootContext,
  Context,
  ContextableElement,
  Store,
  RefRecord,
} from './types.ts'

export const globalRefs: RefRecord = {}

const contexts = new WeakMap<ContextableElement, Context>()

// Create the root context object that gets passed to all directives.
// The data property here is all reactive data because it comes directly from the
// proxy store.
export function createRootContext(el: ShadowRoot, {data}: Store) {
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
export function createSubContext(ctx: Context, el: ContextableElement, data: Record<string, any>): Context {
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

export function cleanup(el: ContextableElement) {
  const ctx = contexts.get(el)
  if (!ctx) return
  
  // Run all cleanup functions
  ctx.cleanup?.forEach(fn => fn())
  
  // Remove context (and cleanup array) from WeakMap
  contexts.delete(el)
}
