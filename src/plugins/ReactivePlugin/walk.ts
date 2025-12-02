import type {Context, DirectiveDef} from './types.ts'
import { getDirectives } from './utils.ts'
import { dirTextOrHTML } from './directives/textOrHtml.ts'
import { dirShow } from './directives/show.ts'
import { dirEvent } from './directives/event.ts'
import { dirAttribute } from './directives/attribute.ts'
import { dirRef } from './directives/ref.ts'
import { dirFor } from './directives/for.ts'
import { dirIs } from './directives/is.ts'

export function walk(ctx: Context, node: Node): ChildNode | null | void {
  // Skip text nodes, comments, etc - only process element nodes
  if (node.nodeType !== 1) return
  if (!ctx) return

  const el = node as Element

  const {control, normal} = getDirectives(el)
  const getCtrl = (name: string) => control[name]


  let dir: DirectiveDef | null
  if ((dir = getCtrl('u-show'))) {
    dirShow(ctx, el as HTMLElement, dir)
  }
  if ((dir = getCtrl('u-for'))) {
    return dirFor(ctx, el, dir)
  }
  if ((dir = getCtrl('u-is'))) {
    return dirIs(ctx, el, dir)
  }

  let next: ChildNode | null | void = null

  for (const dir of Object.values(normal)) {
    switch(dir.key) {
    case 'u-bind':
      dirAttribute(ctx, el as HTMLElement, dir)
      break
    case 'u-on':
      dirEvent(ctx, el, dir)
      break
    case 'u-text':
    case 'u-html':
      dirTextOrHTML(ctx, el as HTMLElement, dir)
      break
    case 'u-ref':
      dirRef(ctx, el, dir)
      break
    }
  }

  walkChildren(ctx, el)

  return next
}

export function walkChildren(ctx: Context, node: Element | DocumentFragment) {
  let child = node.firstChild
  while (child) {
    child = walk(ctx, child) || child.nextSibling
  }
}
