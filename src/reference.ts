
export interface ComponentIdentity {
  readonly name: string,
  readonly path: string,
}
export type ComponentDef = {
  readonly name: string,
  readonly path: string,
  readonly tpl: HTMLTemplateElement,
}

type PluginStart = (man: ComponentManager) => Promise<void>
type PluginParse = (params: PluginParseParams) => Promise<void>
type PluginDefine = (params: PluginDefineParams) => Promise<void>
type PluginConstruct = (params: PluginConstructParams) => void

export type PluginCallbackBuilder<T extends PluginCallbackType> =
  (params: PluginCallbackBuilderParams) =>
  (...params: Parameters<T>) => void | Promise<void>


export type PluginCallbackBuilderParams = {
  Com: WebComponentConstructor,
  Raw: RawComponentConstructor,
  el: WebComponent,
  root: ShadowRoot,
  man: ComponentManager,
}

type CustomElementCallbackReturn = void | Promise<void>
export type AttributeChangedCallback = (name: string, oldValue: string | null, newValue: string | null) => CustomElementCallbackReturn
export type ConnectedCallback = () => CustomElementCallbackReturn
export type DisconnectedCallback = () => CustomElementCallbackReturn
export type FormAssociatedCallback = (form: HTMLFormElement | null) => CustomElementCallbackReturn
export type FormDisabledCallback = (isDisabled: boolean) => CustomElementCallbackReturn
export type FormResetCallback = () => CustomElementCallbackReturn
export type FormStateRestoreCallback = (state: string | File | FormData, reason: 'autocomplete' | 'restore') => CustomElementCallbackReturn

export type PluginCallbackKey =
  'attributeChangedCallback'
  | 'connectedCallback'
  | 'disconnectedCallback'
  // | 'formAssociatedCallback'
  // | 'formDisabledCallback'
  // | 'formResetCallback'
  // | 'formStateRestoreCallback'

export type PluginCallbackType =
  AttributeChangedCallback
  | ConnectedCallback
  | DisconnectedCallback
  // | FormAssociatedCallback
  // | FormDisabledCallback
  // | FormResetCallback
  // | FormStateRestoreCallback

export type CallbackRelated = {
  [k in PluginCallbackKey]: (...args: any[]) => any
}

export interface PluginCallbacks extends Partial<CallbackRelated> {
  attributeChangedCallback?: PluginCallbackBuilder<AttributeChangedCallback>
  connectedCallback?: PluginCallbackBuilder<ConnectedCallback>
  disconnectedCallback?: PluginCallbackBuilder<DisconnectedCallback>
  // formAssociatedCallback?: PluginCallbackBuilder<FormAssociatedCallback>
  // formDisabledCallback?: PluginCallbackBuilder<FormDisabledCallback>
  // formResetCallback?: PluginCallbackBuilder<FormResetCallback>
  // formStateRestoreCallback?: PluginCallbackBuilder<FormStateRestoreCallback>
}

export interface Plugin extends PluginCallbacks {
  start?: PluginStart
  parse?: PluginParse
  define?: PluginDefine
  construct?: PluginConstruct
}

export type PluginManagerCallback = (builder: PluginCallbackBuilderParams) => void
export type PluginManagerCallbackWithParams<T extends PluginCallbackType> = (builder: PluginCallbackBuilderParams, params: Parameters<T>) => void

export interface PluginManager extends CallbackRelated {
  start: PluginStart
  parse: PluginParse
  define: PluginDefine
  construct: PluginConstruct

  attributeChangedCallback: PluginManagerCallbackWithParams<AttributeChangedCallback>
  connectedCallback: PluginManagerCallback
  disconnectedCallback: PluginManagerCallback
  // formAssociatedCallback: PluginManagerCallbackWithParams<FormAssociatedCallback>
  // formDisabledCallback: PluginManagerCallbackWithParams<FormDisabledCallback>
  // formResetCallback: PluginManagerCallback
  // formStateRestoreCallback: PluginManagerCallbackWithParams<FormStateRestoreCallback>
}

export interface ComponentManager {
  lazy: {[key: string]: ComponentIdentity},
  start: () => Promise<void>,
  define: ComponentDefiner,
  import: ComponentImporter,
  resolve: ComponentResolver,
  has: (name: string) => boolean
}
export type ComponentDefiner = (name: string | null, tpl: HTMLTemplateElement) => Promise<ComponentDef | undefined>
export type ComponentImporter = (url: string, tpl?: HTMLTemplateElement) => Promise<ComponentDef | undefined> 
export type ComponentResolver = (url: string) => ComponentIdentity

export type PluginParseParams = {
  man: ComponentManager,
  def: ComponentDef
  frag: DocumentFragment,
}
export type PluginDefineParams = {
  man: ComponentManager,
  Com: WebComponentConstructor,
  Raw: RawComponentConstructor,
  frag: DocumentFragment,
  exports: ModuleExports,
  params: ComponentParams
}
export type PluginConstructParams = {
  man: ComponentManager,
  Com: WebComponentConstructor
  Raw: RawComponentConstructor,
  el: WebComponent,
  root: ShadowRoot,
}

export type ModuleExports = Record<string, any>
export type ComponentParams = Set<DirectiveDef>

export type DirectiveDef = {
  full: string
  op: string
  kebab?: string
  camel?: string
  expr: string
  mods: Set<string>
}

export interface RawComponent extends HTMLElement {
  attributeChangedCallback?(...args: Parameters<AttributeChangedCallback>): CustomElementCallbackReturn
  connectedCallback?(): CustomElementCallbackReturn
  disconnectedCallback?(): CustomElementCallbackReturn
  formAssociatedCallback?(...args: Parameters<FormAssociatedCallback>): CustomElementCallbackReturn
  formDisabledCallback?(...args: Parameters<FormDisabledCallback>): CustomElementCallbackReturn
  formResetCallback?(): CustomElementCallbackReturn
  formStateRestoreCallback?(...args: Parameters<FormStateRestoreCallback>): CustomElementCallbackReturn
}

export interface RawComponentConstructor {
  new (...args: any[]): RawComponent
  formAssociated?: boolean
  observedAttributes?: string[]
}

// Plugins which add to either WebComponent or its constructor should create an Upgrade interface for it.
export interface WebComponent extends RawComponent {
}
export interface WebComponentConstructor extends RawComponentConstructor {
  new (...args: any[]): WebComponent
  def: ComponentDef
  observedAttributes: string[]
}

export type QueryableRoot = Document | DocumentFragment | Element 

//////////////////////////
// CONSTANTS
//////////////////////////

export const SYS_PREFIX = 'u-com'
export const FILE_POSTFIX = '.html'
export const DIR_POSTFIX = '.ucom'

export const CONSTRUCTOR = 'constructor'
export const ATTRIBUTE_CHANGED = 'attributeChangedCallback'
export const CONNECTED = 'connectedCallback'
export const DISCONNECTED = 'disconnectedCallback'
export const FORM_ASSOCIATED = 'formAssociatedCallback'
export const FORM_DISABLED = 'formDisabledCallback'
export const FORM_RESET = 'formResetCallback'
export const FORM_STATE_RESTORE = 'formStateRestoreCallback'

// export const CUSTOM_CALLBACKS = [
//   ATTRIBUTE_CHANGED,
//   CONNECTED,
//   DISCONNECTED,
//   FORM_ASSOCIATED,
//   FORM_DISABLED,
//   FORM_RESET,
//   FORM_STATE_RESTORE,
// ]
// export const CUSTOM_CALLBACKS_SET = new Set(CUSTOM_CALLBACKS)

export const STATIC_FORM_ASSOCIATED = 'formAssociated'
export const STATIC_OBSERVED_ATTRIBUTES = 'observedAttributes'

export const STORE_MOD_VAR = 'var'
export const STORE_MOD_CALC = 'calc'
export const STORE_MOD_SYNC = 'sync'
export const STORE_MOD_SAVE = 'save'
export type STORE_TYPE = typeof STORE_MOD_VAR | typeof STORE_MOD_CALC | typeof STORE_MOD_SYNC | typeof STORE_MOD_SAVE
export const storeMods = new Set<STORE_TYPE>([STORE_MOD_VAR, STORE_MOD_CALC, STORE_MOD_SYNC, STORE_MOD_SAVE])
