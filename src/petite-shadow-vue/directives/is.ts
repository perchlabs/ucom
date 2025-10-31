import type { Context } from '../context'
import { Block } from '../block'
import { evaluate } from '../eval'
import { nextTick } from '../scheduler'

export const _is = (el: Element, exp: string, ctx: Context) => {
  if (!exp.trim()) {
    console.warn(`u-is expression cannot be empty.`)
  }

  const nextNode = el.nextSibling
  const parent = el.parentElement ?? el.getRootNode() as ShadowRoot
  const anchor = new Comment('u-is')
  parent.insertBefore(anchor, el)
  parent.removeChild(el)

  if (!exp) {
    return nextNode
  }

  let block: Block | undefined
  let tagName: string

  ctx.effect(async () => {
    const v = evaluate(ctx.scope, exp)
    if (v === tagName && block) {
      return
    }
    if (block) {
      parent.insertBefore(anchor, block.el)
      block.remove()
      block = undefined
      tagName = ''
    }
    if (!v) {
      return
    }

    await nextTick(() => {
      tagName = v
      const tag = document.createElement(tagName)
      for (const {name, value} of el.attributes) {
        tag.setAttribute(name, value)
      }

      block = new Block(tag, ctx)
      block.insert(parent, anchor)  
      parent.removeChild(anchor)
    })
  })

  return nextNode
}
