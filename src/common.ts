import {
  FILE_POSTFIX,
  DIR_POSTFIX,
  CORE_FUNCTIONS_SET,
} from './constants.ts'

export const reComponentPath = new RegExp(`.*?([a-z]+\-[a-z0-9]+)(${FILE_POSTFIX}|${DIR_POSTFIX})$`)
export const isValidComponentPath = (path: string) => reComponentPath.test(path)
export const isValidComponentName = (v: string, toLowerCase = false) => {
  if (toLowerCase) {
    v = v.toLowerCase()
  }
  return /^[a-z]+\-[a-z0-9]+$/.test(v)
}

export function isSystemKey(k: string) {
  if (k in CORE_FUNCTIONS_SET) return true
  if (k.startsWith('$')) return true
  return false
}

export const $attr = (el: HTMLElement | null, name: string, fallback?: any): any => {
  const attr = el?.getAttribute(name)
  if (fallback !== undefined && !attr) {
    return fallback
  }
  return attr === '' ? true : attr
}

export const $attrBool = (el: HTMLElement | null, name: string): boolean => {
  return name in (el?.attributes ?? {})
}

export const $attrList = (el: HTMLElement | null, name: string): string[] => {
  return (el?.getAttribute?.(name) ?? '').split(',').filter(Boolean)
}

export const pullAttr = (el: Element, name: string): string | null => {
  const val = el.getAttribute(name)
  if (val != null) {
    el.removeAttribute(name)
  }
  return val
}

export const getTopLevelChildren = <T extends HTMLElement>(
  container: DocumentFragment | HTMLElement,
  ...tags: string[]
) => {
  return Array.from(container.children).filter(({tagName: k}) => tags.includes(k)) as T[]
}

export function getAttributes(el: Element): [k: string, v: string][] {
  return Array.from(el.attributes).map(({name, value}) => [name, value])
}
