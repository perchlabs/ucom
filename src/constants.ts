export const ATTR_CORE = 'u-com'

export const FILE_POSTFIX = '.html'
export const DIR_POSTFIX = '.ucom'

export const ATTRIBUTE_CHANGED = 'attributeChangedCallback'
export const CONNECTED = 'connectedCallback'
export const DISCONNECTED = 'disconnectedCallback'
export const FORM_ASSOCIATED = 'formAssociatedCallback'
export const FORM_DISABLED = 'formDisabledCallback'
export const FORM_RESET = 'formResetCallback'
export const FORM_STATE_RESTORE = 'formStateRestoreCallback'

export const CUSTOM_CALLBACKS = [
  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  FORM_ASSOCIATED,
  FORM_DISABLED,
  FORM_RESET,
  FORM_STATE_RESTORE,
]

export const STATIC_FORM_ASSOCIATED = 'formAssociated'
export const STATIC_OBSERVED_ATTRIBUTES = 'observedAttributes'

export const CORE_FUNCTIONS_SET = new Set(['constructor', ...CUSTOM_CALLBACKS])

export const STORE_MOD_VAR = 'var'
export const STORE_MOD_CALC = 'calc'
export const STORE_MOD_SYNC = 'sync'
export const STORE_MOD_SAVE = 'save'
