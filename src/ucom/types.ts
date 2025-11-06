
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

export type PluginProvider<T> = (params: PluginCallbackProviderParams) => T
export type PluginCallbackProviderParams = {
  Component: WebComponentConstructor,
  Raw: RawComponentConstructor,
  el: WebComponent,
  shadow: ShadowRoot,
}

export interface Plugin {
  start?: PluginStart
  parse?: PluginParse
  define?: PluginDefine
  construct?: PluginConstruct

  attributeChanged?: PluginProvider<AttributeChangedCallback>
  connected?: PluginProvider<ConnectedCallback>
  disconnected?: PluginProvider<DisconnectedCallback>
  formAssociated?: PluginProvider<FormAssociatedCallback>
  formDisabled?: PluginProvider<FormDisabledCallback>
  formReset?: PluginProvider<FormResetCallback>
  formStateRestore?: PluginProvider<FormStateRestoreCallback>
}

export interface PluginManager {
  start: PluginStart
  parse: PluginParse
  define: PluginDefine
  construct: PluginConstruct

  connected: PluginManagerProvider<ConnectedCallback>
  disconnected: PluginManagerProvider<DisconnectedCallback>
  attributeChanged: PluginManagerProvider<AttributeChangedCallback>
  formAssociated: PluginManagerProvider<FormAssociatedCallback>
  formDisabled: PluginManagerProvider<FormDisabledCallback>
  formReset: PluginManagerProvider<FormResetCallback>
  formStateRestore: PluginManagerProvider<FormStateRestoreCallback>
}
type PluginManagerProvider<T> = (params: PluginCallbackProviderParams) => T[]



export interface ComponentManager {
  lazy: {[key: string]: ComponentIdentity},
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
  Component: WebComponentConstructor,
  Raw: RawComponentConstructor,
  exports: ModuleExports,
}

export type PluginConstructParams = PluginCoreParams & {
  Component: WebComponentConstructor
  Raw: RawComponentConstructor,
  el: WebComponent,
  shadow: ShadowRoot,
}

export type ModuleExports = Record<string, any>

type CustomElementCallbackReturn = void | Promise<void>
export type AttributeChangedCallback = (name: string, oldValue: string | null, newValue: string | null) => CustomElementCallbackReturn
export type ConnectedCallback = () => CustomElementCallbackReturn
export type DisconnectedCallback = () => CustomElementCallbackReturn
export type FormAssociatedCallback = (form: HTMLFormElement | null) => CustomElementCallbackReturn
export type FormDisabledCallback = (isDisabled: boolean) => CustomElementCallbackReturn
export type FormResetCallback = () => CustomElementCallbackReturn
export type FormStateRestoreCallback = (state: string | File | FormData, reason: 'autocomplete' | 'restore') => CustomElementCallbackReturn

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
