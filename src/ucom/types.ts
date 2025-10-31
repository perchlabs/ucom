

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

export interface Plugin {
  start?: PluginStart
  parse?: PluginParse
  define?: PluginDefine
  construct?: PluginConstruct

  attributeChangedProvider?: PluginProvider<AttributeChangedCallback>
  connectedProvider?: PluginProvider<ConnectedCallback>
  disconnectedProvider?: PluginProvider<DisconnectedCallback>
  formAssociatedProvider?: PluginProvider<FormAssociatedCallback>
  formDisabledProvider?: PluginProvider<FormDisabledCallback>
  formResetProvider?: PluginProvider<FormResetCallback>
  formStateRestoreProvider?: PluginProvider<FormStateRestoreCallback>
}
export type PluginProvider<T> = (params: PluginCallbackProviderParams) => T

export type PluginCallbackProviderParams = {
  Component: WebComponentConstructor,
  Raw: RawComponentConstructor,
  el: WebComponent,
  shadow: ShadowRoot,
}


type PluginStart = (params: PluginStartParams) => Promise<void>
type PluginParse = (params: PluginParseParams) => Promise<void>
type PluginDefine = (params: PluginDefineParams) => Promise<void>
type PluginConstruct = (params: PluginConstructParams) => void

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

export interface ModuleExports {[key: string]: any}

type CustomElementCallbackReturn = void | Promise<void>
export type AttributeChangedCallback = (name: string, oldValue: string | null, newValue: string | null) => CustomElementCallbackReturn
export interface ConnectedCallback { (): CustomElementCallbackReturn }
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
  observedAttributes?: string[]
  formAssociated?: boolean
}

export interface WebComponent extends RawComponent {}

export interface WebComponentConstructor extends RawComponentConstructor {
  new (...args: any[]): WebComponent
  get ident(): ComponentDef
}

export type QueryableRoot = Document | ShadowRoot | Element | DocumentFragment
