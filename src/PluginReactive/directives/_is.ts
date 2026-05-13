import type {
  DirectiveHandler,
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

export const _is: DirectiveHandler = (
  ctx,
  el,
  {exp},
) => {
  const {man} = ctx
  if (!exp) {
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
    is = undefined

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

    is = makeElementAs(el, tagName)
    walk(ctx, is)
    el.before(is)
  }, () => {
    is = undefined
  })
}
