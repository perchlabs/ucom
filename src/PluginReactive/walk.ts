import type {
  DirectiveDef,
} from '../reference.ts'
import type {
  Context,
  ContextableNode,
  DirectiveHandler,
  WalkableReturnType,
} from './reference.ts'
import { safeNodeName } from '../common.ts'
import { getDirectives, pullDir } from '../directive.ts'
import { nextWalkable } from './utils.ts'
import void_meta from './void_meta'

import { _show } from './directives/_show.ts'
import { _if } from './directives/_if.ts'
import { _for } from './directives/_for.ts'
// import { _for } from './directives/_for_experimental.ts'
import { _is } from './directives/_is.ts'

import { _text } from './directives/_text.ts'
import { _event } from './directives/_event.ts'
import { _attribute } from './directives/_attribute.ts'
import { _ref } from './directives/_ref.ts'

export function walk(ctx: Context, el: Element): WalkableReturnType {
  switch (safeNodeName(el)) {
    case 'meta':
      return void_meta(ctx, el as HTMLMetaElement)
  }

  let def: DirectiveDef | undefined 

  for (const [key, handler] of ctrlDirs) {
    if (def = pullDir(el, key)) {
      return handler(ctx, el, def)
    }
  }

  let next: WalkableReturnType
  for (def of getDirectives(el, reDir)) {
    if (next = dirMap[def.op]?.(ctx, el, def)) {
      return next
    }
  }

  walkChildren(ctx, el)
}

export function walkChildren(ctx: Context, node: ContextableNode = ctx.walkable) {
  let child: WalkableReturnType = node.firstElementChild
  while (child) {
    child = walk(ctx, child) ?? nextWalkable(child)
  }
}

// These directives don't support references or modifiers. (Must match exact string)
const ctrlDirs: [string, DirectiveHandler][] = [
  ['#if', _if],
  ['#each', _for],
  ['u-is', _is],
  ['u-show', _show],
]

const reDir = /^u-|%|@|:/
const dirMap: Record<string, DirectiveHandler> = {
  'u-ref': _ref,
  '%': _text,
  ':': _attribute,
  '@': _event,
}
