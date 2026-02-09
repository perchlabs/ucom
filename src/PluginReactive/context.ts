import type {
  ComponentManager,
} from '../types.ts'
import type {
  Store,
  // RootContext,
  Context,
  ContextableNode,
  RefRecord,
} from './types.ts'

export const globalRefs: RefRecord = {}

const contexts = new WeakMap<ContextableNode, Context>()

// Create the root context object that gets passed to all directives.
export function createRootContext(shadow: ShadowRoot, man: ComponentManager, store: Store) {
  const ctx: Context = {
    shadow,
    man,
    store,
    refs: {},
    cleanup: [],
  }
  contexts.set(shadow, ctx)
  return ctx
}

// Create a sub context for sub blocks.
// The data parameter here is not reactive.  It is mixed in with reactive data from
// the root context.
export function createScopedContext(ctx: Context, el: Element, store: Store) {
  const {shadow, man, refs} = ctx
  const subctx: Context = {
    shadow,
    man,
    store,
    refs: {...refs},
    cleanup: [],
  }
  contexts.set(el, subctx)
  return subctx
}

export function cleanup(el: ContextableNode) {
  const ctx = contexts.get(el)
  if (!ctx) return

  // Run all cleanup functions
  ctx.cleanup.forEach(fn => fn())

  // Remove context (and cleanup array) from WeakMap
  contexts.delete(el)
}
