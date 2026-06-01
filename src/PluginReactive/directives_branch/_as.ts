import type {
  BranchDirectiveHandler,
} from '../reference.ts'
import {
  isString,
  isTemplateElement,
  isValidComponentName,
  isValidComponentPath,
} from '../../common.ts'
import {
  makeElementAs,
} from '../utils.ts'
import { walk } from '../walk.ts'

export const _as: BranchDirectiveHandler = (
  ctx,
  el,
  {exp},
) => {
  const {man} = ctx
  if (!exp) {
    console.warn(`[#as] empty expression`)
    return
  }
  if (!isTemplateElement(el)) {
    console.warn(`[#as] not a template`)
    return
  }

  let as: HTMLElement | undefined

  ctx.effect(() => {
    as?.remove()
    as = undefined

    const value = ctx.eval(exp)
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
         man.get(path)
        }
      } catch (e) {
        return
      }
    } else {
      return
    }

    as = makeElementAs(el, tagName)
    walk(ctx, as)
    el.before(as)
  }, () => {
    as = undefined
  })
}
