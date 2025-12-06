import type {
  Context,
  DirectiveDef,
  DirectiveHandler,
} from './types.ts'
import { pullAttr } from '../common.ts'
import { _textOrHTML } from './directives/_textOrHtml.ts'
import { _show } from './directives/_show.ts'
import { _event } from './directives/_event.ts'
import { _attribute } from './directives/_attribute.ts'
import { _ref } from './directives/_ref.ts'
import { _for } from './directives/_for.ts'
import { _is } from './directives/_is.ts'

export function walk(ctx: Context, node: Node): ChildNode | null | void {
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

  getDirectives(el).forEach(def => dirMap[def.key]?.(ctx, el, def))

  walkChildren(ctx, el)
}

export function walkChildren(ctx: Context, node: Element | DocumentFragment) {
  let child = node.firstChild
  while (child) {
    child = walk(ctx, child) || child.nextSibling
  }
}

// Split directive name to handle modifiers
// (e.g. "u-on:click" -> ["u-on", "click"])
function getDirectives(el: Element) {
  return Array.from(el.attributes)
    .filter(attr => attr.name.startsWith('u-'))
    .map(({name, value}) => createDirective(name, value))
}

const dirMap: Record<string, DirectiveHandler> = {
  'u-bind': _attribute,
  'u-on': _event,
  'u-text': _textOrHTML,
  'u-html': _textOrHTML,
  'u-ref': _ref,
}

function createDirective(name: string, value: string): DirectiveDef {
  const [key, modifier] = name.split(':')
  return {key, value, modifier}
}

function pullDir (el: Element, name: string) {
  const attr = pullAttr(el, name)
  if (attr) {
    return createDirective(name, attr)
  }
}
