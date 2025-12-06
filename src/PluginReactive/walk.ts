import type {
  Context,
  DirectiveDef,
  DirectiveHandler,
} from './types.ts'
import { getDirectives, pullDir } from './utils.ts'
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

  let def: DirectiveDef | undefined
  if ((def = pullDir(el, 'u-show'))) {
    dirShow(ctx, el as HTMLElement, def)
  }
  if (def = pullDir(el, 'u-for')) {
    return dirFor(ctx, el, def)
  }
  if (def = pullDir(el, 'u-is')) {
    return dirIs(ctx, el, def)
  }

  for (const def of getDirectives(el)) {
    dirMap[def.key]?.(ctx, el as HTMLElement, def)
  }

  walkChildren(ctx, el)
}

export function walkChildren(ctx: Context, node: Element | DocumentFragment) {
  let child = node.firstChild
  while (child) {
    child = walk(ctx, child) || child.nextSibling
  }
}

const dirMap: Record<string, DirectiveHandler> = {
  'u-bind': dirAttribute,
  'u-on': dirEvent,
  'u-text': dirTextOrHTML,
  'u-html': dirTextOrHTML,
  'u-ref': dirRef,
}
