import type {
  Context,
  ContextableNode,
  DirectiveDef,
  DirectiveHandler,
  DirectiveHandlerReturn,
} from './types.ts'
import { createScopedContext } from './context.ts'
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

const reDir = /^u-|\$|%|@|:/
const dirMap: Record<string, DirectiveHandler> = {
  'u-ref': _ref,
  'u-html': _html,
  '%': _text,
  ':': _attribute,
  '@': _event,
}

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

  const {d1, d2 = []} = Object.groupBy(
    getDirectives(el, reDir),
    def => def.key == '$' ? 'd1' : 'd2',
  )

  if (d1) {
    ctx = createScopedContext(ctx, el)
    for (const def of d1) {
      _data(ctx, el, def)
    }
  }

  let next: DirectiveHandlerReturn
  for (const def of d2) {
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
