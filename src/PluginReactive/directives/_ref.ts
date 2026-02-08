import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  globalRefs,
} from '../context.ts'

export function _ref(ctx: Context, el: Element, dir: DirectiveDef): undefined {
  const {
    mod,
    val: name,
  } = dir

  const refs = mod === 'global' ? globalRefs : ctx.refs
  refs[name] = new WeakRef(el)
}
