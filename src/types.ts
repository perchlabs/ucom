
export interface ComponentIdentity {
  readonly name: string,
  readonly resolved: string,
}
export type ComponentDef = {
  readonly name: string,
  readonly resolved: string,
  readonly tpl: HTMLTemplateElement,
}

export interface PluginConstructor {
  new (...args: any[]): Plugin
}

type PluginStart = (params: PluginStartParams) => Promise<void>
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
  shadow: ShadowRoot,
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
  registered: (name: string) => boolean
  isName: (name: string, toLowerCase?: boolean) => boolean
  isPath: (path: string) => boolean
}
export type ComponentDefiner = (name: string | null, tpl: HTMLTemplateElement) => Promise<ComponentDef | undefined>
export type ComponentImporter = (url: string, tpl?: HTMLTemplateElement) => Promise<ComponentDef | undefined> 
export type ComponentResolver = (url: string) => ComponentIdentity

export type PluginStartParams = {
  man: ComponentManager,
}
export type PluginParseParams = {
  man: ComponentManager,
  def: ComponentDef
  frag: DocumentFragment,
}
export type PluginPredefineParams = {
  man: ComponentManager,
  def: ComponentDef
  frag: DocumentFragment,
  exports: ModuleExports,
}

export type PluginDefineParams = {
  man: ComponentManager,
  Com: WebComponentConstructor,
  Raw: RawComponentConstructor,
  frag: DocumentFragment,
  exports: ModuleExports,
}

export type PluginConstructParams = {
  man: ComponentManager,
  Com: WebComponentConstructor
  Raw: RawComponentConstructor,
  el: WebComponent,
  shadow: ShadowRoot,
}

export type ModuleExports = Record<string, any>


export interface RawComponent extends HTMLElement {
  attributeChangedCallback?(...args: Parameters<AttributeChangedCallback>): CustomElementCallbackReturn
  connectedCallback?(params: {shadow: ShadowRoot, internals?: ElementInternals}): CustomElementCallbackReturn
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
export interface WebComponent extends RawComponent {}
export interface WebComponentConstructor extends RawComponentConstructor {
  new (...args: any[]): WebComponent
  get def(): ComponentDef
  observedAttributes: string[]
}

export type QueryableRoot = Document | ShadowRoot | Element | DocumentFragment
