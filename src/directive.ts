import type {
  DirectiveDef,
} from './reference.ts'
import {
  attributeEntries,
  pullAttr,
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

const reDirectiveExpand = /^(?<op>#[a-z]+)|(?<op>\$|\$--|\$%%|\$!!|--|%%|!!|@|\?|\||\(\))(?<kebab>[a-z]+(-[a-z0-9]+)*)?(?<mods>(\.[a-z0-9\(\)]+)*)$/

const reMod = /^\.(?<mod>[a-z]+)((?:\()(?<arg>[a-z0-9]+)(?:\)))?$/g

interface DirectiveGroups {
  op: string
  kebab: string | undefined
  mods: string | undefined
}

interface ModificationGroups {
  mod: string
  arg: string | undefined
}

export const createDirectiveDefinition = (full: string, exp: string): DirectiveDef | undefined => {
  const match = full.match(reDirectiveExpand)
  if (match) {
    const {op, kebab, mods: modsRaw = ''} = match.groups as unknown as DirectiveGroups

    const mods = new Map<string, string | undefined>()
    for (const modMatch of modsRaw.matchAll(reMod)) {
      const {mod, arg} = modMatch.groups as unknown as ModificationGroups
      mods.set(mod, arg)
    }

    return {
      full,
      op,
      kebab,
      camel: kebab ? kebabToCamel(kebab) : undefined,
      exp: exp.trim(),
      mods,
    }
  }
}
