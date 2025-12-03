import type {
  Context,
  ContextableElement,
  ProxyStore,
  RefRecord,
} from './types.ts'

export const globalRefs: RefRecord = {}

const contexts = new WeakMap<ContextableElement, Context>()

// Create the root context object that gets passed to all directives.
export function createRootContext(el: ContextableElement, {data}: ProxyStore) {
  // The data property here is all reactive data because it comes directly from the
  // proxy store.

  const ctx: Context = {
    el,
    data,
    refs: {},
    cleanup: [],
  }
  contexts.set(el, ctx)
  return ctx
}

// Create a sub context for sub blocks.
export function createSubContext(ctx: Context, el: ContextableElement, data: Record<string, any>): Context {
  // The data parameter here is not reactive.  It is mixed in with reactive data from
  // the root context.

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
  if (el == null) {
    console.warn('[cleanup] Called on a null/undefined element.')
    return
  }

  const ctx = contexts.get(el)
  if (!ctx) return
  
  // Run all cleanup functions
  ctx.cleanup?.forEach(fn => fn())
  
  // Remove context (and cleanup array) from WeakMap
  contexts.delete(el)
}
