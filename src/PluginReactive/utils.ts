import type {
  DirectiveDef,
} from '../reference.ts'
import type {
  ContextableNode,
  WalkableReturn,
} from './reference.ts'
import {
  createElement,
  isTemplateElement,
  attributeEntries,
} from '../common.ts'

export const contextableParent = (el: Node) => el?.parentNode as ContextableNode | null

export const nextWalkable = (el: Element): WalkableReturn => el.nextElementSibling

// export function createAnchor({key}: DirectiveDef, parent: ContextableNode, el: HTMLElement): Comment {
//   const anchor = new Comment(key)
//   parent.insertBefore(anchor, el)
//   return anchor
// }

export const parentAndAnchor = (
  el: Element,
  dir?: DirectiveDef,
): [ContextableNode | null, Comment] => {
  const parent = contextableParent(el)
  const anchor = new Comment(dir?.op ?? '')

  if (parent) {
    parent.insertBefore(anchor, el)
  }

  return [parent, anchor]
}

export const makeElementAs = (el: Element, tagName: string) => {
  const tag = createElement(tagName)
  attributeEntries(el).forEach(e => tag.setAttribute(...e))

  if (isTemplateElement(el)) {
    tag.append(el.content)
  } else {
    tag.innerHTML = el.innerHTML
  }

  return tag
}
