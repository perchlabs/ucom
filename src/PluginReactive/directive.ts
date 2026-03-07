import type {
  DirectiveDef,
} from './types.ts'
import { getAttributes, pullAttr } from '../common.ts'

export const getDirectives = (el: Element, reDir: RegExp) => getAttributes(el)
  .filter(([k]) => reDir.test(k))
  .map(item => createDirective(...item))

export function createDirective(full: string, val: string): DirectiveDef {
  if (full.startsWith('u-')) {
    const [key, keyRight] = full.split(':')
    const [ref, mod] = keyRight?.split('.') ?? []
    return {full, key, ref, val, mod}
  } else {
    const [key] = full
    const [ref, mod] = full.substring(1).split('.')

    return {
      full,
      key,
      ref,
      val,
      mod,
    }
  }
}

export function pullDir(el: Element, key: string) {
  const attr = pullAttr(el, key)
  if (attr) {
    return createDirective(key, attr)
  }
}
