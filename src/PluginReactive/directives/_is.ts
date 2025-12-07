import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import { effect } from '../alien-signals'
import { cleanup } from '../context.ts'
import { getParent, makeElementAs } from '../utils.ts'
import { evaluate } from '../expression.ts'
import { walk } from '../walk.ts'

export function _is(ctx: Context, el: Element, dir: DirectiveDef) {
  const {value: expr} = dir

  if (!expr.trim()) {
    return console.warn(`u-is expression cannot be empty.`)
  }

  if (!(el instanceof HTMLTemplateElement)) {
    return console.warn(`u-is may only be placed on a template.`)
  }

  const next = el.nextSibling

  const parent = getParent(el)
  const anchor = new Comment(dir.key)
  parent.insertBefore(anchor, el)
  parent.removeChild(el)

  let tagName = ''
  let tag: Element | undefined

  const dispose = effect(() => {
    const v = evaluate(ctx, expr)
    if (!v || v === tagName) {
      return
    }

    if (tag) {
      parent.insertBefore(anchor, tag)
      cleanup(tag)
      tag.remove()
    }

    tagName = v
    tag = makeElementAs(el, tagName)

    parent.insertBefore(tag, anchor)
    parent.removeChild(anchor)

    walk(tag, ctx)
  })

  ctx.cleanup.push(dispose)

  return next
}
