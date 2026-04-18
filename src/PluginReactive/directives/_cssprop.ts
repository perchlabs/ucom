import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  kebabToCamel,
} from '../../common.ts'
import { evaluate } from '../expression.ts'

export function _cssprop(ctx: Context, dir: DirectiveDef, el: HTMLElement) {
  const {
    ref: cssVarName,
    expr,
  } = dir

  if (!cssVarName) {
    return
  }

  const exprReal = expr ? expr : kebabToCamel(cssVarName)
  ctx.effect(() => {
    try {
      const value = evaluate(exprReal, ctx)
      el.style.setProperty(`--${cssVarName}`, value)
    } catch (e) {
      console.error(`[--${cssVarName}] `, e)
    }
  })
}
