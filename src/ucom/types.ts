
export interface ComponentIdentity {
  name: string,
  resolved: string,
}
export interface ComponentDef extends ComponentIdentity {
  tpl: HTMLTemplateElement,
}

export interface PluginConstructor {
  new (...args: any[]): Plugin
}

type PluginStart = (params: PluginStartParams) => Promise<void>
type PluginParse = (params: PluginParseParams) => Promise<void>
type PluginDefine = (params: PluginDefineParams) => Promise<void>
type PluginConstruct = (params: PluginConstructParams) => void

export type PluginProvider<T extends PluginCallbackType> =
  (params: PluginCallbackProviderParams) =>
  (...params: Parameters<T>) => void | Promise<void>


export type PluginCallbackProviderParams = {
  Com: WebComponentConstructor,
  Raw: RawComponentConstructor,
  el: WebComponent,
  shadow: ShadowRoot,
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
  'attributeChangedCallback' |
  'connectedCallback' |
  'disconnectedCallback' |
  'formAssociatedCallback' |
  'formDisabledCallback' |
  'formResetCallback' |
  'formStateRestoreCallback'

export type PluginCallbackType =
  AttributeChangedCallback |
  ConnectedCallback | 
  DisconnectedCallback |
  FormAssociatedCallback |
  FormDisabledCallback |
  FormResetCallback |
  FormStateRestoreCallback

export type CallbackRelated = {
  [k in PluginCallbackKey]: (...args: any[]) => any
}

export interface PluginCallbacks extends Partial<CallbackRelated> {
  attributeChangedCallback?: PluginProvider<AttributeChangedCallback>
  connectedCallback?: PluginProvider<ConnectedCallback>
  disconnectedCallback?: PluginProvider<DisconnectedCallback>
  formAssociatedCallback?: PluginProvider<FormAssociatedCallback>
  formDisabledCallback?: PluginProvider<FormDisabledCallback>
  formResetCallback?: PluginProvider<FormResetCallback>
  formStateRestoreCallback?: PluginProvider<FormStateRestoreCallback>
}

export interface Plugin extends PluginCallbacks {
  start?: PluginStart
  parse?: PluginParse
  define?: PluginDefine
  construct?: PluginConstruct
}

export type PluginManagerProvider = (builder: PluginCallbackProviderParams) => void
export type PluginManagerProviderWithParams<T extends PluginCallbackType> = (builder: PluginCallbackProviderParams, params: Parameters<T>) => void

export interface PluginManager extends CallbackRelated {
  start: PluginStart
  parse: PluginParse
  define: PluginDefine
  construct: PluginConstruct

  attributeChangedCallback: PluginManagerProviderWithParams<AttributeChangedCallback>
  connectedCallback: PluginManagerProvider
  disconnectedCallback: PluginManagerProvider
  formAssociatedCallback: PluginManagerProviderWithParams<FormAssociatedCallback>
  formDisabledCallback: PluginManagerProviderWithParams<FormDisabledCallback>
  formResetCallback: PluginManagerProvider
  formStateRestoreCallback: PluginManagerProviderWithParams<FormStateRestoreCallback>
}


export interface ComponentManager {
  lazy: {[key: string]: ComponentIdentity},
  start: () => Promise<void>,
  define: ComponentDefiner,
  import: ComponentImporter,
  resolve: ComponentResolver,
  registered: (name: string) => boolean
}
export type ComponentDefiner = (name: string | null, tpl: HTMLTemplateElement) => Promise<ComponentDef | undefined>
export type ComponentImporter = (url: string, tpl?: HTMLTemplateElement) => Promise<ComponentDef | undefined> 
export type ComponentResolver = (url: string) => ComponentIdentity

export interface PluginCoreParams {
  man: ComponentManager,
  ident: ComponentDef
}

export type PluginStartParams = {
  man: ComponentManager,
}
export type PluginParseParams = PluginCoreParams & {
  frags: DocumentFragment,
}
export type PluginDefineParams = PluginCoreParams & {
  Com: WebComponentConstructor,
  Raw: RawComponentConstructor,
  exports: ModuleExports,
}

export type PluginConstructParams = PluginCoreParams & {
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
  get ident(): ComponentDef
}

export type QueryableRoot = Document | ShadowRoot | Element | DocumentFragment
