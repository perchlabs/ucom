import type {
  ContextableElement,
} from './types.ts'

export function getParent(el: ContextableElement): ContextableElement {
  return el.parentElement ?? el.getRootNode() as ShadowRoot
}

export function getDirectives(el: Element) {
  return Array.from(el.attributes)
    .filter(attr => attr.name.startsWith('u-'))
    .map(attr => ({ name: attr.name, value: attr.value }))
}
