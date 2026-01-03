import type { Context } from '../types.ts'
import { makeElementAs } from '../utils.ts'

export function void_meta(_ctx: Context, el: HTMLMetaElement) {
  const span = makeElementAs(el, 'span')
  el.replaceWith(span)
  return span
}
