import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  kebabToCamel,
} from '../../common.ts'
import { evaluate } from '../expression.ts'

export function _cssprop(ctx: Context, dir: DirectiveDef, el: Element) {
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
      const value = evaluate(exprReal, ctx) as string
      (el as HTMLElement).style.setProperty(`--${cssVarName}`, value)
    } catch (e) {
      console.error(`[--${cssVarName}] `, e)
    }
  })
}
