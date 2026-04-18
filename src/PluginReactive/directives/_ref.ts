import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  globalRefs,
} from '../context.ts'

export function _ref(ctx: Context, dir: DirectiveDef, el: Element): undefined {
  const {mods, expr} = dir

  const refs = mods.has('global') ? globalRefs : ctx.refs
  refs[expr] = new WeakRef(el)
}
