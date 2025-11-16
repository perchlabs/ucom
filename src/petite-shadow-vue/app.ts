import { reactive } from '@vue/reactivity'
import { Block } from './block'
import { bindContextMethods, createContext } from './context'
import { toDisplayString } from './directives/text'
import { nextTick } from './scheduler'

export const createApp = (root: ShadowRoot, data?: any) => {
  // root context
  const ctx = createContext()

  if (data) {
    ctx.scope = reactive(data)
    bindContextMethods(ctx.scope)
  }

  // global internal helpers
  Object.assign(ctx.scope, {
    $s: toDisplayString,
    $nextTick: nextTick,
    $refs: Object.create(null),
  })

  const rootBlock = new Block(root, ctx)

  return () => rootBlock.teardown()
}
