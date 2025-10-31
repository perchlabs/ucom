import type {
  PluginManager,
  Plugin,
  PluginConstructor,
  PluginStartParams,
  PluginParseParams,
  PluginDefineParams,
  PluginConstructParams,
  PluginCallbackProviderParams,

  ConnectedCallback,
  DisconnectedCallback,
  AttributeChangedCallback,
  FormAssociatedCallback,
  FormDisabledCallback,
  FormResetCallback,
  FormStateRestoreCallback,
} from './types.ts'

export default class PlugMan implements PluginManager {
  #plugins: Plugin[]

  constructor(pluginClasses: PluginConstructor[]) {
    this.#plugins = pluginClasses.map(v => new v)
  }

  async start(params: PluginStartParams) {
    const promises = this.#plugins.map(v => v.start?.(params))
    await Promise.all(promises)
  }

  async parse(params: PluginParseParams) {
    this.#plugins.forEach(async (p) => await p.parse?.(params))
  }

  async define(params: PluginDefineParams) {
    this.#plugins.forEach(async (p) => await p.define?.(params))
  }

  construct(params: PluginConstructParams): void {
    this.#plugins.forEach(p => p.construct?.(params))
  }

  connected(params: PluginCallbackProviderParams): ConnectedCallback[] {
    return this.#plugins
      .map(v => v.connectedProvider?.(params))
      .filter(v => !!v)
  }

  disconnected(params: PluginCallbackProviderParams): DisconnectedCallback[] {
    return this.#plugins
      .map(v => v.disconnectedProvider?.(params))
      .filter(v => !!v)
  }

  attributeChanged(params: PluginCallbackProviderParams): AttributeChangedCallback[] {
    return this.#plugins
      .map(p => p.attributeChangedProvider?.(params))
      .filter(p => !!p)
  }

  formAssociated(params: PluginCallbackProviderParams): FormAssociatedCallback[] {
    return this.#plugins
      .map(p => p.formAssociatedProvider?.(params))
      .filter(p => !!p)
  }

  formDisabled(params: PluginCallbackProviderParams): FormDisabledCallback[] {
    return this.#plugins
      .map(p => p.formDisabledProvider?.(params))
      .filter(p => !!p)
  }

  formReset(params: PluginCallbackProviderParams): FormResetCallback[] {
    return this.#plugins
      .map(p => p.formResetProvider?.(params))
      .filter(p => !!p)
  }

  formStateRestore(params: PluginCallbackProviderParams): FormStateRestoreCallback[] {
    return this.#plugins
      .map(p => p.formStateRestoreProvider?.(params))
      .filter(p => !!p)
  }
}
