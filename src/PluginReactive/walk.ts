import type {
  Context,
  ContextableNode,
  DirectiveDef,
  DirectiveHandler,
} from './types.ts'
import { pullAttr } from '../common.ts'
import { _text } from './directives/_text.ts'
import { _html } from './directives/_html.ts'
import { _show } from './directives/_show.ts'
import { _event } from './directives/_event.ts'
import { _attribute } from './directives/_attribute.ts'
import { _ref } from './directives/_ref.ts'
import { _for } from './directives/_for.ts'
import { _is } from './directives/_is.ts'
import { _data } from './directives/_data.ts'

export function walk(node: Node, ctx: Context): ChildNode | null | void {
  // Skip text nodes, comments, etc - only process element nodes
  if (node.nodeType !== 1) return
  if (!ctx) return

  const el = node as HTMLElement

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

  let next: ChildNode | undefined
  for (const def of getDirectives(el)) {
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

const reDir = /^u-|\$|@|:/
const getDirectives = (el: Element) => Array.from(el.attributes)
  .filter(attr => reDir.test(attr.name))
  .map(({name, value}) => createDirective(name, value))

const dirMap: Record<string, DirectiveHandler> = {
  'u-data': _data,
  'u-text': _text,
  '$': _text,
  'u-html': _html,
  'u-bind': _attribute,
  ':': _attribute,
  'u-on': _event,
  '@': _event,
  'u-ref': _ref,
}

function createDirective(keyReal: string, value: string): DirectiveDef {
  let ch1 = keyReal[0]
  if (['@', '$', ':'].includes(ch1)) {
    return {
      key: ch1,
      value,
      modifier: keyReal.substring(1),
    }
  }

  const [key, modifier] = keyReal.split(':')
  return {key, value, modifier}
}

function pullDir (el: Element, key: string) {
  const attr = pullAttr(el, key)
  if (attr) {
    return createDirective(key, attr)
  }
}
