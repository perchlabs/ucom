import type {
  ContextableElement,
  DirectiveDef,
} from './types.ts'

export function getParent(el: ContextableElement): ContextableElement {
  return el.parentElement ?? el.getRootNode() as ShadowRoot
}

const controllers: Readonly<Set<string>> = new Set([
  'u-show',
  'u-for',
  'u-is',
])

export function getDirectives(el: Element) {
  const control: Record<string, DirectiveDef> = {}
  const normal: DirectiveDef[] = []
  
  Array.from(el.attributes)
    .filter(attr => attr.name.startsWith('u-'))
    .forEach(({name, value}) => {
      // Split directive name to handle modifiers
      // (e.g. "u-on:click" -> ["u-on", "click"])
      const [key, modifier] = name.split(':')
      const def = {key, modifier, value}

      if (controllers.has(key)) {
        control[key] = def
      } else {
        normal.push(def)
      }
    })
  return {control, normal}
}
