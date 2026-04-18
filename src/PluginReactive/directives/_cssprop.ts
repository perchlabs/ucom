import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  kebabToCamel,
} from '../../common.ts'
import { effect } from '../alien-signals'
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
  const dispose = effect(() => {
    try {
      const value = evaluate(exprReal, ctx)
      el.style.setProperty(`--${cssVarName}`, value)
    } catch (e) {
      console.error(`[--${cssVarName}] `, e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}
