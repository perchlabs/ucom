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

export const PARAM_MOD_VAR = 'var'
export const PARAM_MOD_PROP = 'prop'
export const PARAM_MOD_COMP = 'comp'
export const PARAM_MOD_SYNC = 'share'
export const PARAM_MOD_SAVE = 'save'
// export const PARAM_MODS = [
//   PARAM_MOD_VARIABLE,
//   PARAM_MOD_PROP,
//   PARAM_MOD_COMP,
//   PARAM_MOD_SYNCED,
//   PARAM_MOD_PERSISTED,
// ] as const
export const PARAM_TOP_MODS = {
  [PARAM_MOD_VAR]: true,
  [PARAM_MOD_PROP]: true,
  [PARAM_MOD_COMP]: true,
  [PARAM_MOD_SYNC]: true,
  [PARAM_MOD_SAVE]: true,
}  as const
export const PARAM_BODY_MODS = {
  [PARAM_MOD_VAR]: true,
  [PARAM_MOD_COMP]: true,
}  as const
