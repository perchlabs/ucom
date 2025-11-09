import type {
  PluginManager,
  PluginConstructor,
  PluginStartParams,
  PluginParseParams,
  PluginDefineParams,
  PluginConstructParams,
  PluginCallbackProviderParams,

  PluginProvider,

  AttributeChangedCallback,
  ConnectedCallback,
  DisconnectedCallback,
  FormAssociatedCallback,
  FormDisabledCallback,
  FormResetCallback,
  FormStateRestoreCallback,

  PluginCallbackKey,
  PluginCallbackType,
  PluginCallbacks,
} from './types.ts'
import {
  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  FORM_ASSOCIATED,
  FORM_DISABLED,
  FORM_RESET,
  FORM_STATE_RESTORE,
} from './common.ts'

export default (pluginClasses: PluginConstructor[]): PluginManager  => {
  const plugins = pluginClasses.map(v => new v)

  function provide<T extends PluginCallbackType>(
    key: PluginCallbackKey,
    builderParams: PluginCallbackProviderParams,
  ) {
    return plugins
      .map((p: PluginCallbacks) => (p[key] as PluginProvider<T>)?.(builderParams))
      .filter(v => !!v)
  }

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

    [ATTRIBUTE_CHANGED](builder: PluginCallbackProviderParams, params: Parameters<AttributeChangedCallback>) {
      provide<AttributeChangedCallback>(ATTRIBUTE_CHANGED, builder).map(async f => await f(...params))
    },
    [CONNECTED](builder: PluginCallbackProviderParams) {
      provide<ConnectedCallback>(CONNECTED, builder).map(async f => await f())
    },
    [DISCONNECTED](builder: PluginCallbackProviderParams) {
      provide<DisconnectedCallback>(DISCONNECTED, builder).map(async f => await f())
    },
    [FORM_ASSOCIATED](builder: PluginCallbackProviderParams, params: Parameters<FormAssociatedCallback>) {
      provide<FormAssociatedCallback>(FORM_ASSOCIATED, builder).map(async f => await f(...params))
    },
    [FORM_DISABLED](builder: PluginCallbackProviderParams, params: Parameters<FormDisabledCallback>) {
      provide<FormDisabledCallback>(FORM_DISABLED, builder).map(async f => await f(...params))
    },
    [FORM_RESET](builder: PluginCallbackProviderParams) {
      provide<FormResetCallback>(FORM_RESET, builder).map(async f => await f())
    },
    [FORM_STATE_RESTORE](builder: PluginCallbackProviderParams, params: Parameters<FormStateRestoreCallback>) {
      provide<FormStateRestoreCallback>(FORM_STATE_RESTORE, builder).map(async f => await f(...params))
    },
  }
}
