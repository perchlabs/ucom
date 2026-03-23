import type {
  Context,
  ContextableNode,
  DirectiveDef,
  DirectiveHandler,
  DirectiveHandlerReturn,
} from './types.ts'
import { getDirectives, pullDir } from './directive.ts'
import { void_meta } from './voids/void_meta.ts'
import { _data } from './directives/_data.ts'
import { _text } from './directives/_text.ts'
import { _html } from './directives/_html.ts'
import { _show } from './directives/_show.ts'
import { _event } from './directives/_event.ts'
import { _attribute } from './directives/_attribute.ts'
import { _ref } from './directives/_ref.ts'
import { _for } from './directives/_for.ts'
import { _is } from './directives/_is.ts'

export function walk(node: Element | DocumentFragment, ctx: Context): Element | null | void {
  // Skip text nodes, comments, etc - only process element nodes
  if (node.nodeType !== 1) return

  const el = node as HTMLElement

  switch (el.tagName) {
    case 'META':
      return void_meta(ctx, el as HTMLMetaElement)
  }

  let def: DirectiveDef | undefined 
  if ((def = pullDir(el, 'u-show'))) {
    _show(ctx, el, def)
  }
  if (def = pullDir(el, 'u-for')) {
    return _for(ctx, el, def)
  }
  if (def = pullDir(el, 'u-is')) {
    return _is(ctx, el, def)
  }

  let next: DirectiveHandlerReturn
  for (const def of getDirectives(el, reDir)) {
    if (next = dirMap[def.key]?.(ctx, el, def)) {
      return next
    }
  }

  walkChildren(el, ctx)
}

export function walkChildren(node: ContextableNode, ctx: Context) {
  let child = node.firstElementChild
  while (child) {
    child = walk(child, ctx) || child.nextElementSibling
  }
}

const reDir = /^u-|%|@|:/
const dirMap: Record<string, DirectiveHandler> = {
  'u-ref': _ref,
  'u-html': _html,
  '%': _text,
  ':': _attribute,
  '@': _event,
}
