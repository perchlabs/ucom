import type {
  DirectiveHandler,
} from '../reference.ts'
import {
  globalRefs,
} from '../context.ts'

export const _ref: DirectiveHandler = (
  ctx,
  el,
  {mods, exp},
) => {
  if (exp) {
    const refs = mods.has('global') ? globalRefs : ctx.refs
    refs[exp] = new WeakRef(el)
  }
}
