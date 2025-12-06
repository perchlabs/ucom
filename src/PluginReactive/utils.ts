import type {
  ContextableElement,
} from './types.ts'

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
