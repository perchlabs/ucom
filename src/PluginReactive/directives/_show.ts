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
  if (exp && isHTMLElement(el)) {
    const initialDisplay = el.style.display

    ctx.effect(() => {
      el.style.display = evaluate(exp, ctx) ? initialDisplay : 'none'
    })
  }
}
