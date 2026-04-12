import type {
  DirectiveDef,
} from './types.ts'
import { attributeEntries, pullAttr } from '../common.ts'

export const getDirectives = (el: Element, reDir: RegExp) =>
  attributeEntries(el).
  filter(([k]) => reDir.test(k)).
  map(item => createDirectiveDefinition(...item))

export function createDirectiveDefinition(full: string, val: string): DirectiveDef {
  if (full.startsWith('u-')) {
    const [key, keyRight] = full.split(':')
    const [ref, mod] = keyRight?.split('.') ?? []
    return {full, key, ref, expr: val, mod}
  } else {
    const [key] = full
    const [ref, mod] = full.substring(1).split('.')

    return {
      full,
      key,
      ref,
      mod,
      expr: val,
    }
  }
}

export function pullDir(el: Element, key: string) {
  const attr = pullAttr(el, key)
  if (attr) {
    return createDirectiveDefinition(key, attr)
  }
}
