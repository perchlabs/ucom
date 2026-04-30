import type {
  DirectiveHandler,
} from '../reference.ts'
import {
  globalRefs,
} from '../context.ts'

export const _ref: DirectiveHandler = (
  ctx,
  el,
  {mods, expr},
) => {
  if (expr) {
    const refs = mods.has('global') ? globalRefs : ctx.refs
    refs[expr] = new WeakRef(el)
  }
}
