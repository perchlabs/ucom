import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  globalRefs,
} from '../context.ts'

export function _ref(ctx: Context, el: Element, dir: DirectiveDef): undefined {
  const {
    value: refName,
    modifier,
  } = dir

  const refs = modifier === 'global' ? globalRefs : ctx.refs
  refs[refName] = new WeakRef(el)
}
