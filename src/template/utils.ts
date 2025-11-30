import type {
  ContextableElement,
  DirectiveDef,
} from './types.ts'

export function getParent(el: ContextableElement): ContextableElement {
  return el.parentElement ?? el.getRootNode() as ShadowRoot
}

export function getDirectives(el: Element) {
  const hitmap: Record<string, boolean> = {}
  const directives = Array.from(el.attributes)
    .filter(attr => attr.name.startsWith('u-'))
    .map(({name, value}): DirectiveDef => {
      // Split directive name to handle modifiers
      // (e.g. "u-on:click" -> ["u-on", "click"])
      const [directive, modifier] = name.split(':')
      hitmap[directive] = true
      return {
        directive,
        modifier,
        value,
      }
    })
  return {directives, hitmap}
}
