import type {
  ContextableElement,
} from './types.ts'

export function getParent(el: ContextableElement): ContextableElement | undefined {
  return el.parentElement ?? el.getRootNode() as ShadowRoot
}
