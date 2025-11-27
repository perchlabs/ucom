import type {
  ContextableElement,
  DirectiveDef,
} from './types.ts'

export function getParent(el: ContextableElement): ContextableElement {
  return el.parentElement ?? el.getRootNode() as ShadowRoot
}

export function getDirectives(el: Element) {
  const directives: Record<string, DirectiveDef> = {} 
  Array.from(el.attributes)
    .filter(attr => attr.name.startsWith('u-'))
    .forEach(({name, value}) => {
      // Split directive name to handle modifiers
      // (e.g. "u-on:click" -> ["u-on", "click"])
      const [directive, modifier] = name.split(':')
      directives[directive] = {
        directive,
        modifier,
        value,
      } 
    })
  return directives
}
