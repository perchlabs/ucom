import {
  FILE_POSTFIX,
  DIR_POSTFIX,
  CONSTRUCTOR,
} from './constants.ts'
import type {
  QueryableRoot,
} from './types.ts'

export const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean'
export const isNumber = (v: unknown): v is number => typeof v === 'number'
export const isString = (v: unknown): v is string => typeof v === 'string'
export const isFunction = (v: unknown) => typeof v === 'function'
export const isArray = Array.isArray
export const isObject = (v: unknown): v is Record<any, any> =>
  typeof v === 'object' && v !== null && !isArray(v)
export const isTemplateElement = (v: unknown) => v instanceof HTMLTemplateElement
export const isElement = (v: Node): v is Element => v?.nodeType === 1

export const ObjectAssign = Object.assign
export const ObjectKeys = Object.keys
export const ObjectValues = Object.values
export const ObjectEntries = Object.entries
export const ObjectFromEntries = Object.fromEntries
export const ObjectDefineProperty = Object.defineProperty
export const ArrayFrom = Array.from

export function ObjectEntriesEach<T>(
  obj: Record<string, T>,
  each: (entry: [k: string, v: T]) => void,
) {
  ObjectEntries(obj).forEach(each)
}

export const reComponentPath = new RegExp(`.*?([a-z]+\-[a-z0-9]+)(${FILE_POSTFIX}|${DIR_POSTFIX})$`)
export const isValidComponentPath = (path: string) => reComponentPath.test(path)
export const isValidComponentName = (v: string) => /^[a-z]+\-[a-z0-9]+$/.test(v.toLowerCase())

export function isSystemKey(k: string) {
  return k === CONSTRUCTOR ||
    k.startsWith('$')
}

export const attrToggled = (el: Element, name: string): boolean =>
  el.hasAttribute(name) ?? false

export const pullKey = <T>(obj: Record<string, T>, k: string): (T | undefined) => {
  const v = obj[k]
  if (v != null) {
    delete obj[k]
  }
  return v
}

export const pullAttr = (el: Element, name: string): string | null => {
  const val = el.getAttribute(name)
  if (val != null) {
    el.removeAttribute(name)
  }
  return val
}

export function paramsAttrEach(
  obj: Record<string, string>,
  re: RegExp,
  func: (k: string, v: string) => void,
) {
  for (const k in obj) {
    const kk = k.match(re)?.[1]
    if (kk) {
      func(kk, pullKey(obj, k)!)
    }
  }
}

export function attributeEntries(el: Element): [k: string, v: string][] {
  return ArrayFrom(el.attributes).map(({name, value}) => [name, value])
}

export function uniqueArr(...arrArr: any[]) {
  return [...new Set(arrArr.flat())]
}

export function cloneTemplateContent(tpl: HTMLTemplateElement) {
  return tpl.content.cloneNode(true) as DocumentFragment
}

export function queryAll<T extends Element>(root: QueryableRoot, selector: string): T[] {
  return ArrayFrom(root.querySelectorAll(selector) ?? []) as T[]
}

export const getTopLevelChildren = <T extends HTMLElement>(
  container: DocumentFragment | HTMLElement,
  ...tags: string[]
) => 
  ArrayFrom(container.children).filter(el => tags.includes(el.tagName)) as T[]

export const kebabize = (v: string) => v.replace(/([A-Z])/g, '-$1').toLowerCase()

export const kebabToCamel = (v: string) => v.replace(/-./g, m => m.toUpperCase()[1])

export const split = (v: string, s: string = ' ') => v.split(s).filter(c => c)
