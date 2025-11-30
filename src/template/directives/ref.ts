import type {
  Context,
} from '../types.ts'
import {
  globalRefs,
} from '../context.ts'

export function bindRef(ctx: Context, el: Element, refName: string, global: boolean) {
  const refs = global ? globalRefs : ctx.refs
  refs[refName] = new WeakRef(el)
}
