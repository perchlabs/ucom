import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  globalRefs,
} from '../context.ts'

export function dirRef(ctx: Context, el: Element, dir: DirectiveDef) {
  const {
    value: refName,
    modifier,
  } = dir

  const refs = modifier === 'global' ? globalRefs : ctx.refs
  refs[refName] = new WeakRef(el)
}
