import type {
  DirectiveDef,
} from './reference.ts'
import {
  attributeEntries,
  pullAttr,
  split,
  kebabToCamel,
} from './common.ts'

export const getDirectives = (el: Element, reFilter?: RegExp) =>
  attributeEntries(el).
  filter(([k]) => reFilter?.test(k) ?? true).
  flatMap(item => createDirectiveDefinition(...item) ?? [])

export const pullDir = (el: Element, key: string) => {
  const attr = pullAttr(el, key)
  if (attr) {
    return createDirectiveDefinition(key, attr)
  }
}

const reDirectiveExpand = /^(u-[a-z]+|[^a-z]{1,3})(:?[a-z0-9]+[a-z0-9\-]*)?(\..+)*$/

const createDirectiveDefinition = (full: string, exp: string): DirectiveDef | undefined => {
  const match = full.match(reDirectiveExpand)
  if (match) {
    let [, op, kebab, mods = ''] = match
    kebab = kebab?.[0] === ':' ? kebab.substring(1) : kebab

    return {
      op,
      kebab,
      camel: kebab ? kebabToCamel(kebab) : undefined,
      exp,
      mods: new Set<string>(split(mods, '.')),
    }
  }
}
