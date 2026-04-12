import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import { isValidComponentPath } from '../../common.ts'
import { effect } from '../alien-signals'
import { makeElementAs, nextWalkable, parentAndAnchor } from '../utils.ts'
import { evaluate } from '../expression.ts'
import { walk } from '../walk.ts'

export function _is(ctx: Context, dir: DirectiveDef, el: Element) {
  const {man} = ctx
  let {expr} = dir

  expr = expr.trim()
  if (!expr) {
    console.warn(`[u-is] empty expression.`)
    return
  }

  if (!(el instanceof HTMLTemplateElement)) {
    console.warn(`[u-is] not a template.`)
    return
  }

  const [parent, anchor] = parentAndAnchor(dir, el)
  if (!parent) {
    console.warn('[u-is] no parent')
    return
  }

  const next = nextWalkable(el)

  parent.removeChild(el)

  let tagName = ''
  let tag: HTMLElement | undefined

  const dispose = effect(() => {
    if (tag) {
      parent.insertBefore(anchor, tag)
      tag.remove()
    }

    let tagNameNew = ''
    const ref = evaluate(expr, ctx)
    if (isValidComponentPath(ref)) {
      try {
        const {name, resolved} = man.resolve(ref)
        tagNameNew = name
        if (!man.registered(tagNameNew)) {
          man.import(resolved)
        }
      } catch (e) {
        return
      }
    } else {
      tagNameNew = evaluate(expr, ctx)
    }

    if (!tagNameNew || tagNameNew === tagName) {
      return
    }

    tagName = tagNameNew
    tag = makeElementAs(el, tagName)

    parent.insertBefore(tag, anchor)
    parent.removeChild(anchor)

    walk(ctx, tag)
  })

  ctx.cleanup.push(dispose)

  return next
}
