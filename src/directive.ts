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
  if (attr !== null) {
    return createDirectiveDefinition(key, attr)
  }
}

// const reDirectiveExpand = /^(\$|\$--|--|@|%|%%|\?|[#][a-z]+):?([a-z]+[a-z0-9\-]*)?(\..+)*$/
const reDirectiveExpand = /^(\$|\$--|\$!!|--|%|!!|@|\?|#[a-z]+):?([a-z]+[a-z0-9\-]*)?(\..+)*$/

export const createDirectiveDefinition = (full: string, exp: string): DirectiveDef | undefined => {
  const match = full.match(reDirectiveExpand)
  if (match) {
    let [, op, kebab, mods = ''] = match
    return {
      full,
      op,
      kebab,
      camel: kebab ? kebabToCamel(kebab) : undefined,
      exp: exp.trim(),
      mods: new Set<string>(split(mods, '.')),
    }
  }
}
