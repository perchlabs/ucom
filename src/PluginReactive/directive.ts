import type {
  DirectiveDef,
} from './types.ts'
import { attributeEntries, pullAttr } from '../common.ts'

export const getDirectives = (el: Element, reFilter: RegExp) =>
  attributeEntries(el).
  filter(([k]) => reFilter.test(k)).
  map(item => createDirectiveDefinition(...item)).
  filter(v => !!v)

export const reDirDef = /^(u-[a-z]+|[^a-z]{1,2})(:?[a-z0-9]+[a-z0-9\-]*)?(\..+)*$/

export function createDirectiveDefinition(full: string, expr: string): DirectiveDef | undefined {
  const match = full.match(reDirDef)

  if (match) {
    let [, key, ref, mods = ''] = match

    ref = ref?.charAt(0) === ':' ? ref.substring(1) : ref

    const modList = mods
      .split('.')
      .filter(v => !!v)

    return {
      full,
      key,
      ref,
      expr,
      mods: new Set<string>(modList),
    }
  }
}

export function pullDir(el: Element, key: string) {
  const attr = pullAttr(el, key)
  if (attr) {
    return createDirectiveDefinition(key, attr)
  }
}
