import type {
  Context,
  ContextableElement,
  ProxyStore,
  RefRecord,
} from './types.ts'

export const globalRefs: RefRecord = {}

const contexts = new WeakMap<ContextableElement, Context>()

export function createContext(el: ContextableElement, [data, signals]: ProxyStore) {
  // Create the context object that gets passed to all directives
  const ctx: Context = {
    el, // The element itself
    data, // Reactive data proxy
    signals, // Raw signals (for advanced use)
    refs: {},
    cleanup: [], // Cleanup functions
  }
  contexts.set(el, ctx)
  return ctx
}

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
