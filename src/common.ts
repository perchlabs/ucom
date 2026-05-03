import {
  FILE_POSTFIX,
  DIR_POSTFIX,
  CONSTRUCTOR,
} from './reference.ts'
import type {
  QueryableRoot,
} from './reference.ts'

export const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean'
export const isNumber = (v: unknown): v is number => typeof v === 'number'
export const isString = (v: unknown): v is string => typeof v === 'string'
export const isFunction = (v: unknown): v is ((...args: any[]) => any) => typeof v === 'function'
export const isArray = Array.isArray
export const isObject = (v: unknown): v is Record<any, any> =>
  typeof v === 'object' && v !== null && !isArray(v)
export const isHTMLElement = (v: unknown): v is HTMLElement => v instanceof HTMLElement
export const isShadowRoot = (v: unknown): v is ShadowRoot => v instanceof ShadowRoot
export const isElement = (v: Node): v is Element => v?.nodeType === 1
export const isTemplateElement = (v: Node): v is HTMLTemplateElement => v?.nodeName === 'TEMPLATE'

export const ObjectAssign = Object.assign
export const ObjectKeys = Object.keys
export const ObjectValues = Object.values
export const ObjectEntries = Object.entries
export const ObjectFromEntries = Object.fromEntries
export const ObjectDefineProperty = Object.defineProperty
export const ArrayFrom = Array.from

export const createElement = document.createElement.bind(document)

export const safeNodeName = (node: Node) => node.nodeName.toLowerCase()

export const ObjectEntriesEach = <T>(
  obj: Record<string, T>,
  each: (entry: [k: string, v: T]) => void,
): void => ObjectEntries(obj).forEach(each)

export const reComponentPath = new RegExp(`.*?([a-z]+\-[a-z0-9]+)(${FILE_POSTFIX}|${DIR_POSTFIX})$`)
export const isValidComponentPath = (path: string) => reComponentPath.test(path)
export const isValidComponentName = (v: string) => /^[a-z]+\-[a-z0-9]+$/.test(v.toLowerCase())

export const isUserKey = (k: string) =>
  k !== CONSTRUCTOR &&
  !k.startsWith('$')

export const attrToggled = (el: Element, name: string) =>
  el.hasAttribute(name) ?? false

export const pullAttr = (el: Element, name: string) => {
  const val = el.getAttribute(name)
  if (val != null) {
    el.removeAttribute(name)
  }
  return val
}

export const attributeEntries = (el: Element): [k: string, v: string][] =>
  ArrayFrom(el.attributes).map(({name, value}) => [name, value])

export const uniqueArr = (...arrArr: any[]) =>
  [...new Set(arrArr.flat())]

export const cloneTemplateContent = (tpl: HTMLTemplateElement) =>
  tpl.content.cloneNode(true) as DocumentFragment

export const queryAll = <T extends Element>(root: QueryableRoot, selector: string) =>
  ArrayFrom(root.querySelectorAll(selector) ?? []) as T[]

export const getTopLevelChildren = <T extends HTMLElement>(
  container: DocumentFragment | HTMLElement,
  ...tags: string[]
) => 
  ArrayFrom(container.children).filter(el => tags.includes(safeNodeName(el))) as T[]

export const camelToKebab = (v: string) => v.replace(/([A-Z])/g, '-$1').toLowerCase()

// export const kebabToCamel = (v: string) => v.replace(/-./g, m => m.toUpperCase()[1])
export const kebabToCamel = (v: string) => v.replace(/-./g, m => m[1].toUpperCase())

export const split = (v: string, s: string = ' ') => v.split(s).filter(c => c)

export const hashContent = (tpl: HTMLTemplateElement): number => {
  const div = createElement('div')
  div.appendChild(cloneTemplateContent(tpl))
  return ArrayFrom(div.innerHTML)
    .reduce((hash, char) => char.charCodeAt(0) + (hash << 6) + (hash << 16) - hash, 0)
}
