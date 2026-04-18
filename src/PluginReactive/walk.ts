import type {
  Context,
  ContextableNode,
  DirectiveDef,
  DirectiveHandler,
  DirectiveHandlerReturn,
} from './types.ts'
import { getDirectives, pullDir } from './directive.ts'
import { nextWalkable } from './utils.ts'
import { void_meta } from './voids/void_meta.ts'

import { _show } from './directives/_show.ts'
import { _if } from './directives/_if.ts'
import { _for } from './directives/_for.ts'
// import { _for } from './directives/_for_experimental.ts'
import { _is } from './directives/_is.ts'

import { _data } from './directives/_data.ts'
import { _text } from './directives/_text.ts'
import { _html } from './directives/_html.ts'
import { _event } from './directives/_event.ts'
import { _attribute } from './directives/_attribute.ts'
import { _cssprop } from './directives/_cssprop.ts'
import { _ref } from './directives/_ref.ts'

export function walk(ctx: Context, el: Element): Element | null | void {
  // Skip text nodes, comments, etc - only process element nodes
  if (el.nodeType !== 1) return

  switch (el.tagName) {
    case 'META':
      return void_meta(ctx, el as HTMLMetaElement)
  }

  let def: DirectiveDef | undefined 

  for (const [key, handler] of ctrlDirs) {
    if (def = pullDir(el, key)) {
      return handler(ctx, def, el)
    }
  }

  let next: DirectiveHandlerReturn
  for (def of getDirectives(el, reDir)) {
    if (next = dirMap[def.key]?.(ctx, def, el)) {
      return next
    }
  }

  walkChildren(ctx, el)
}

export function walkChildren(ctx: Context, node: ContextableNode = ctx.walkable) {
  let child = node.firstElementChild
  while (child) {
    child = walk(ctx, child as HTMLElement) ?? nextWalkable(child)
  }
}

const ctrlDirs: [string, DirectiveHandler][] = [
  ['#if', _if],
  ['#each', _for],
  ['u-is', _is],
  ['u-show', _show],
]

const reDir = /^u-|%|@|:|--/
const dirMap: Record<string, DirectiveHandler> = {
  'u-ref': _ref,
  'u-html': _html,
  '%': _text,
  ':': _attribute,
  '@': _event,
  '--': _cssprop,
}
