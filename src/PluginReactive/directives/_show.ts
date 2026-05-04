import type {
  DirectiveHandler,
} from '../reference.ts'
import {
  isHTMLElement,
} from '../../common.ts'
import { evaluate } from '../expression.ts'

export const _show: DirectiveHandler = (
  ctx,
  el,
  {exp},
) => {
  if (!exp || !isHTMLElement(el)) {
    return
  }

  const initialDisplay = el.style.display

  ctx.effect(() => {
    const show = !!evaluate(exp, ctx)
    el.style.display = show ? initialDisplay : 'none'
  })
}
