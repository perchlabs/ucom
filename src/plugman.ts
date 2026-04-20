import type {
  PluginManager,
  Plugin,
  ComponentManager,
  PluginParseParams,
  PluginDefineParams,
  PluginConstructParams,
  PluginCallbackBuilderParams,

  PluginCallbackBuilder,
  PluginCallbackKey,
  PluginCallbackType,
  PluginCallbacks,

  AttributeChangedCallback,
  ConnectedCallback,
  DisconnectedCallback,
  // FormAssociatedCallback,
  // FormDisabledCallback,
  // FormResetCallback,
  // FormStateRestoreCallback,
} from './types.ts'
import {
  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  // FORM_ASSOCIATED,
  // FORM_DISABLED,
  // FORM_RESET,
  // FORM_STATE_RESTORE,
} from './constants.ts'

export default (plugins: Plugin[]): PluginManager  => {
  const provide = <T extends PluginCallbackType>(
    key: PluginCallbackKey,
    builderParams: PluginCallbackBuilderParams,
  ) => plugins.flatMap((p: PluginCallbacks) =>
    (p[key] as PluginCallbackBuilder<T>)?.(builderParams) ?? [])

  return {
    async start(man: ComponentManager) {
      await Promise.all(plugins.map(v => v.start?.(man)))
    },
    async parse(params: PluginParseParams) {
      plugins.forEach(async p => await p.parse?.(params))
    },
    async define(params: PluginDefineParams) {
      plugins.forEach(async p => await p.define?.(params))
    },
    construct(params: PluginConstructParams): void {
      plugins.forEach(p => p.construct?.(params))
    },

    [ATTRIBUTE_CHANGED](builder: PluginCallbackBuilderParams, params: Parameters<AttributeChangedCallback>) {
      provide<AttributeChangedCallback>(ATTRIBUTE_CHANGED, builder).map(async f => await f(...params))
    },
    [CONNECTED](builder: PluginCallbackBuilderParams) {
      provide<ConnectedCallback>(CONNECTED, builder).map(async f => await f())
    },
    [DISCONNECTED](builder: PluginCallbackBuilderParams) {
      provide<DisconnectedCallback>(DISCONNECTED, builder).map(async f => await f())
    },
    // [FORM_ASSOCIATED](builder: PluginCallbackBuilderParams, params: Parameters<FormAssociatedCallback>) {
    //   provide<FormAssociatedCallback>(FORM_ASSOCIATED, builder).map(async f => await f(...params))
    // },
    // [FORM_DISABLED](builder: PluginCallbackBuilderParams, params: Parameters<FormDisabledCallback>) {
    //   provide<FormDisabledCallback>(FORM_DISABLED, builder).map(async f => await f(...params))
    // },
    // [FORM_RESET](builder: PluginCallbackBuilderParams) {
    //   provide<FormResetCallback>(FORM_RESET, builder).map(async f => await f())
    // },
    // [FORM_STATE_RESTORE](builder: PluginCallbackBuilderParams, params: Parameters<FormStateRestoreCallback>) {
    //   provide<FormStateRestoreCallback>(FORM_STATE_RESTORE, builder).map(async f => await f(...params))
    // },
  }
}
