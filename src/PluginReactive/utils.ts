import type {
  ContextableNode,
  DirectiveDef,
} from './types.ts'
import { attributeEntries } from '../common.ts'

export function getParent(el: Node): ContextableNode | undefined{
  const parent = el.parentElement
  if (parent) { 
    return parent
  }

  const root = el.getRootNode() as DocumentFragment | undefined
  return root && root !== el ? root : undefined
}

export function nextWalkable(el: Element): HTMLElement | null {
  return el.nextElementSibling as HTMLElement
}

// export function createAnchor({key}: DirectiveDef, parent: ContextableNode, el: HTMLElement): Comment {
//   const anchor = new Comment(key)
//   parent.insertBefore(anchor, el)
//   return anchor
// }

export function parentAndAnchor(
  dir: DirectiveDef, 
  el: HTMLElement,
  anchorText: string = '',
): [ContextableNode | undefined, Comment] {
  const parent = getParent(el)
  const anchor = new Comment(`${dir.key} ${anchorText}`)

  if (parent) {
    parent.insertBefore(anchor, el)
  }

  return [parent, anchor]
}

export function makeElementAs(el: Element, tagName: string) {
  const tag = document.createElement(tagName)
  attributeEntries(el).forEach(e => tag.setAttribute(...e))

  if (el instanceof HTMLTemplateElement) {
    tag.append(el.content)
  } else {
    tag.innerHTML = el.innerHTML
  }

  return tag
}
