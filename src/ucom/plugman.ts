import type {
  PluginManager,
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

export default (pluginClasses: PluginConstructor[]): PluginManager  => {
  const plugins = pluginClasses.map(v => new v)

  return {
    async start(params: PluginStartParams) {
      const promises = plugins.map(v => v.start?.(params))
      await Promise.all(promises)
    },
    async parse(params: PluginParseParams) {
      plugins.forEach(async (p) => await p.parse?.(params))
    },
    async define(params: PluginDefineParams) {
      plugins.forEach(async (p) => await p.define?.(params))
    },
    construct(params: PluginConstructParams): void {
      plugins.forEach(p => p.construct?.(params))
    },

    connected(params: PluginCallbackProviderParams): ConnectedCallback[] {
      return plugins
        .map(v => v.connected?.(params))
        .filter(v => !!v)
    },
    disconnected(params: PluginCallbackProviderParams): DisconnectedCallback[] {
      return plugins
        .map(v => v.disconnected?.(params))
        .filter(v => !!v)
    },
    attributeChanged(params: PluginCallbackProviderParams): AttributeChangedCallback[] {
      return plugins
        .map(p => p.attributeChanged?.(params))
        .filter(p => !!p)
    },
    formAssociated(params: PluginCallbackProviderParams): FormAssociatedCallback[] {
      return plugins
        .map(p => p.formAssociated?.(params))
        .filter(p => !!p)
    },
    formDisabled(params: PluginCallbackProviderParams): FormDisabledCallback[] {
      return plugins
        .map(p => p.formDisabled?.(params))
        .filter(p => !!p)
    },
    formReset(params: PluginCallbackProviderParams): FormResetCallback[] {
      return plugins
        .map(p => p.formReset?.(params))
        .filter(p => !!p)
    },
    formStateRestore(params: PluginCallbackProviderParams): FormStateRestoreCallback[] {
      return plugins
        .map(p => p.formStateRestore?.(params))
        .filter(p => !!p)
    },
  }
}
