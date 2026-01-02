export const ATTRIBUTE_CHANGED = 'attributeChangedCallback'
export const CONNECTED = 'connectedCallback'
export const DISCONNECTED = 'disconnectedCallback'
export const FORM_ASSOCIATED = 'formAssociatedCallback'
export const FORM_DISABLED = 'formDisabledCallback'
export const FORM_RESET = 'formResetCallback'
export const FORM_STATE_RESTORE = 'formStateRestoreCallback'

export const ATTR_CORE = 'u-com'

export const CUSTOM_CALLBACKS = [
  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  FORM_ASSOCIATED,
  FORM_DISABLED,
  FORM_RESET,
  FORM_STATE_RESTORE,
]

export const FILE_POSTFIX = '.html'
export const DIR_POSTFIX = '.ucom'

export const STATIC_FORM_ASSOCIATED = 'formAssociated'
export const STATIC_OBSERVED_ATTRIBUTES = 'observedAttributes'

export const coreFunctionsSet = new Set(['constructor', ...CUSTOM_CALLBACKS])

export const reComponentPath = new RegExp(`.*?([a-z]+\-[a-z0-9]+)(${FILE_POSTFIX}|${DIR_POSTFIX})$`)
export const isValidComponentPath = (path: string) => reComponentPath.test(path)
export const isValidComponentName = (v: string, toLowerCase = false) => {
  if (toLowerCase) {
    v = v.toLowerCase()
  }
  return /^[a-z]+\-[a-z0-9]+$/.test(v)
}

export function isSystemKey(k: string) {
  if (k in coreFunctionsSet) return true
  if (k.startsWith('$')) return true
  return false
}

export const $attr = (elem: HTMLElement | null, name: string, fallback?: any): any => {
  const attr = elem?.getAttribute(name)
  if (fallback !== undefined && !attr) {
    return fallback
  }
  return attr === '' ? true : attr
}

export const $attrBool = (elem: HTMLElement | null, name: string): boolean => {
  return name in (elem?.attributes ?? {})
}

export const $attrList = (elem: HTMLElement | null, name: string): string[] => {
  return (elem?.getAttribute?.(name) ?? '').split(',').filter(Boolean)
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
  ...tagNames: string[]
) => {
  return Array.from(container.children).filter(({tagName: k}) =>tagNames.includes(k)) as T[]
}
