import type {
  DirectiveDef,
} from './types.ts'
import { getAttributes, pullAttr } from '../common.ts'

export const getDirectives = (el: Element, reDir: RegExp) => getAttributes(el)
  .filter(([k]) => reDir.test(k))
  .map(item => createDirective(...item))

export function createDirective(keyFull: string, val: string): DirectiveDef {
  const ch1 = keyFull[0]
  if (['@', '$', '%', ':'].includes(ch1)) {
    const [ref, mod] = keyFull.substring(1).split('.')

    return {
      key: ch1,
      ref,
      val,
      mod,
    }
  }

  const [key, keyRight] = keyFull.split(':')
  const [ref, mod] = keyRight?.split('.') ?? []
  return {key, ref, val, mod}
}

export function pullDir(el: Element, key: string) {
  const attr = pullAttr(el, key)
  if (attr) {
    return createDirective(key, attr)
  }
}
