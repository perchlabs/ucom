import type {
  DirectiveHandler,
} from '../reference.ts'
import {
  isString,
  isTemplateElement,
  isValidComponentName,
  isValidComponentPath,
} from '../../common.ts'
import { makeElementAs } from '../utils.ts'
import { evaluate } from '../expression.ts'
import { walk } from '../walk.ts'

export const _is: DirectiveHandler = (
  ctx,
  el,
  {expr},
) => {
  const {man} = ctx

  if (!expr) {
    console.warn(`[u-is] empty expression`)
    return
  }
  if (!isTemplateElement(el)) {
    console.warn(`[u-is] not a template`)
    return
  }

  let is: HTMLElement | undefined

  ctx.effect(() => {
    is?.remove()

    const value = evaluate(expr, ctx)
    if (!isString(value)) {
      return
    }

    let tagName: string
    if (isValidComponentName(value)) {
      tagName = value
    } else if (isValidComponentPath(value)) {
      try {
        const {name, path} = man.resolve(value)
        tagName = name
        if (!man.has(tagName)) {
          man.import(path)
        }
      } catch (e) {
        return
      }
    } else {
      return
    }

    is = makeElementAs(el, tagName)
    el.before(is)
    walk(ctx, is)
  })
}
