import type {
  Context,
  ContextableNode,
  DirectiveDef,
  DirectiveHandler,
  DirectiveHandlerReturn,
} from './types.ts'
import { getDirectives, pullDir } from './directive.ts'
import { void_meta } from './voids/void_meta.ts'
import { _var } from './directives/_var.ts'
import { _text } from './directives/_text.ts'
import { _html } from './directives/_html.ts'
import { _show } from './directives/_show.ts'
import { _event } from './directives/_event.ts'
import { _attribute } from './directives/_attribute.ts'
import { _ref } from './directives/_ref.ts'
import { _for } from './directives/_for.ts'
import { _is } from './directives/_is.ts'

export function walk(node: Node, ctx: Context): ChildNode | null | void {
  // Skip text nodes, comments, etc - only process element nodes
  if (node.nodeType !== 1) return
  if (!ctx) return

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
  let child = node.firstChild
  while (child) {
    child = walk(child, ctx) || child.nextSibling
  }
}

const reDir = /^u-|\$|%|@|:/
const dirMap: Record<string, DirectiveHandler> = {
  'u-var': _var,
  '$': _var,
  'u-text': _text,
  '%': _text,
  'u-html': _html,
  'u-bind': _attribute,
  ':': _attribute,
  'u-on': _event,
  '@': _event,
  'u-ref': _ref,
}
