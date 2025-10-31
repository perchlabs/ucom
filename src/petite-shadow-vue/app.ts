import type { Directive } from './directives'
import { reactive } from '@vue/reactivity'
import { Block } from './block'
import { bindContextMethods, createContext } from './context'
import { toDisplayString } from './directives/text'
import { nextTick } from './scheduler'

type appOptions = {delimiters?: [string, string]}

const escapeRegex = (str: string) => str.replace(/[-.*+?^${}()|[\]\/\\]/g, '\\$&')

export const createApp = (data?: any, {delimiters}: appOptions = {}) => {
  // root context
  const ctx = createContext()

  if (data) {
    ctx.scope = reactive(data)
    bindContextMethods(ctx.scope)

    // handle custom delimiters
    if (delimiters) {
      const [open, close] = delimiters
      Object.assign(ctx, {
        delimiters,
        delimitersRE: new RegExp(escapeRegex(open) + '([^]+?)' + escapeRegex(close), 'g'),
      })
    }
  }

  // global internal helpers
  Object.assign(ctx.scope, {
    $s: toDisplayString,
    $nextTick: nextTick,
    $refs: Object.create(null),
  })

  let rootBlock: Block

  return {
    directive(name: string, def?: Directive) {
      if (def) {
        ctx.dirs[name] = def
        return this
      } else {
        return ctx.dirs[name]
      }
    },

    mount(root: Element | ShadowRoot) {
      rootBlock = new Block(root, ctx)
      return this
    },

    unmount() {
      rootBlock.teardown()
    }
  }
}
