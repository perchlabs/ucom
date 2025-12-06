import type {
  ContextableElement,
  DirectiveDef,
} from './types.ts'
import { pullAttr } from '../common.ts'

export function getParent(el: ContextableElement): ContextableElement {
  return el.parentElement ?? el.getRootNode() as ShadowRoot
}

export function makeElementAs(el: Element, tagName: string) {
  const tag = document.createElement(tagName)
  for (const {name, value} of Array.from(el.attributes)) {
    tag.setAttribute(name, value)
  }
  return tag
}

// Split directive name to handle modifiers
// (e.g. "u-on:click" -> ["u-on", "click"])
export function getDirectives(el: Element) {
  return Array.from(el.attributes)
    .filter(attr => attr.name.startsWith('u-'))
    .map(({name, value}) => createDirective(name, value))
}

export function createDirective(name: string, value: string): DirectiveDef {
  const [key, modifier] = name.split(':')
  return {key, value, modifier}
}

export function pullDir (el: Element, name: string) {
  const attr = pullAttr(el, name)

  if (attr) {
    return createDirective(name, attr)
  }
}
