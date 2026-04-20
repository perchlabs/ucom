import type {
  DirectiveDef,
} from './types.ts'
import {
  attributeEntries,
  pullAttr,
  split,
} from '../common.ts'

export const getDirectives = (el: Element, reFilter: RegExp) =>
  attributeEntries(el).
  filter(([k]) => reFilter.test(k)).
  flatMap(item => createDirectiveDefinition(...item) ?? [])

export const reDirDef = /^(u-[a-z]+|[^a-z]{1,2})(:?[a-z0-9]+[a-z0-9\-]*)?(\..+)*$/

export function createDirectiveDefinition(full: string, expr: string): DirectiveDef | undefined {
  const match = full.match(reDirDef)

  if (match) {
    let [, key, ref, mods = ''] = match

    ref = ref?.charAt(0) === ':' ? ref.substring(1) : ref

    return {
      full,
      key,
      ref,
      expr,
      mods: new Set<string>(split(mods, '.')),
    }
  }
}

export function pullDir(el: Element, key: string) {
  const attr = pullAttr(el, key)
  if (attr) {
    return createDirectiveDefinition(key, attr)
  }
}
