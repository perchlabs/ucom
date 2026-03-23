import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  globalRefs,
} from '../context.ts'

export function _ref(ctx: Context, el: HTMLElement, dir: DirectiveDef): undefined {
  const {mod, expr} = dir

  const refs = mod === 'global' ? globalRefs : ctx.refs
  refs[expr] = new WeakRef(el)
}
