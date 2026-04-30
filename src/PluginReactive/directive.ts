import type {
  DirectiveDef,
} from './types.ts'
import {
  attributeEntries,
  pullAttr,
  split,
  kebabToCamel,
} from '../common.ts'

export const getDirectives = (el: Element, reFilter: RegExp) =>
  attributeEntries(el).
  filter(([k]) => reFilter.test(k)).
  flatMap(item => createDirectiveDefinition(...item) ?? [])

export const reDirDef = /^(u-[a-z]+|[^a-z]{1,3})(:?[a-z0-9]+[a-z0-9\-]*)?(\..+)*$/

export function createDirectiveDefinition(full: string, expr: string): DirectiveDef | undefined {
  const match = full.match(reDirDef)

  if (match) {
    let [, key, kebab, mods = ''] = match

    kebab = kebab?.charAt(0) === ':' ? kebab.substring(1) : kebab

    return {
      key,
      kebab,
      camel: kebab ? kebabToCamel(kebab) : undefined,
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
