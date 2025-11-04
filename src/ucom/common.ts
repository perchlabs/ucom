
export const CUSTOM_CALLBACKS = [
  'attributeChangedCallback',
  'connectedCallback',
  'disconnectedCallback',
  'formAssociatedCallback',
  'formDisabledCallback',
  'formResetCallback',
  'formStateRestoreCallback',
]

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

// Taken from petite-vue.
export const checkAttr = (el: Element, name: string): string | null => {
  const val = el.getAttribute(name)
  if (val != null) {
    el.removeAttribute(name)
  }
  return val
}
