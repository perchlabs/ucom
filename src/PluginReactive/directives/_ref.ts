import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  globalRefs,
} from '../context.ts'

export function _ref(ctx: Context, dir: DirectiveDef, el: HTMLElement): undefined {
  const {mod, expr} = dir

  const refs = mod === 'global' ? globalRefs : ctx.refs
  refs[expr] = new WeakRef(el)
}
