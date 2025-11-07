import type {
  PluginManager,
  PluginConstructor,
  PluginStartParams,
  PluginParseParams,
  PluginDefineParams,
  PluginConstructParams,
  PluginCallbackProviderParams,

  Plugin,
  PluginCallbacks,
  PluginProvider,

  AttributeChangedCallback,
  ConnectedCallback,
  DisconnectedCallback,
  FormAssociatedCallback,
  FormDisabledCallback,
  FormResetCallback,
  FormStateRestoreCallback,
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

type PluginCallbackKey = keyof PluginCallbacks

export default (pluginClasses: PluginConstructor[]): PluginManager  => {
  const plugins = pluginClasses.map(v => new v)

  function provide<T>(
    key: PluginCallbackKey,
    builderParams: PluginCallbackProviderParams,
  ) {
    const f = (p: Plugin) => (p[key] as PluginProvider<T>)?.(builderParams)

    return plugins
      .map(f)
      .filter(p => !!p)
  }


  // function run<T>(
  //   key: PluginCallbackKey,
  //   builderParams: PluginCallbackProviderParams,
  //   params: Array<string>,
  // ) {

  // }


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

    [ATTRIBUTE_CHANGED](k: PluginCallbackKey, builder: PluginCallbackProviderParams, params: Parameters<AttributeChangedCallback>) {
      const list = provide<AttributeChangedCallback>(k, builder)
      list.forEach(async f => await f(...params))
    },
    [CONNECTED](k: PluginCallbackKey, builder: PluginCallbackProviderParams) {
      const list = provide<ConnectedCallback>(k, builder)
      list.forEach(async f => await f())
    },
    [DISCONNECTED](k: PluginCallbackKey, builder: PluginCallbackProviderParams) {
      const list = provide<DisconnectedCallback>(k, builder)
      list.forEach(async f => await f())
    },
    [FORM_ASSOCIATED](k: PluginCallbackKey, builder: PluginCallbackProviderParams, params: Parameters<FormAssociatedCallback>) {
      const list = provide<FormAssociatedCallback>(k, builder)
      list.forEach(async f => await f(...params))
    },
    [FORM_DISABLED](k: PluginCallbackKey, builder: PluginCallbackProviderParams, params: Parameters<FormDisabledCallback>) {
      const list = provide<FormDisabledCallback>(k, builder)
      list.forEach(async f => await f(...params))
    },
    [FORM_RESET](k: PluginCallbackKey, builder: PluginCallbackProviderParams) {
      const list = provide<FormResetCallback>(k, builder)
      list.forEach(async f => await f())
    },
    [FORM_STATE_RESTORE](k: PluginCallbackKey, builder: PluginCallbackProviderParams, params: Parameters<FormStateRestoreCallback>) {
      const list = provide<FormStateRestoreCallback>(k, builder)
      list.forEach(async f => await f(...params))
    },
  }
}
