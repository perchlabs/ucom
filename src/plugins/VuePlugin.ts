import type {
  RawComponentConstructor,
  WebComponent,
  WebComponentConstructor,
  Plugin,
  PluginDefineParams,
  PluginCallbackProviderParams,
  ModuleExports,
  AttributeChangedCallback,
  ConnectedCallback,
  DisconnectedCallback,
} from '../ucom'
import {CUSTOM_CALLBACKS} from '../ucom'
import {createApp, reactive, effect, stop, nextTick} from '../petite-shadow-vue'

// Proto constants.
const PropDefsKey = '$ucom_vue_props'
const StoreMakerKey = '$ucom_vue_store'
// Instance constants.
const DataKey = '$data'
const CleanupKey = '$__ucom_vue_cleanup__'

const StoreSkip = new Set(['constructor', ...CUSTOM_CALLBACKS])
const persistMap = new Map<string, any>
const syncMap = new Map<string, any>

const PROP_REFLECT_DEFAULT = true

export default class VuePlugin implements Plugin {
  async define({Com, exports}: PluginDefineParams) {
    const proto = Com.prototype

    const Upgrade = Com as UpgradeComponentConstructor
    const {$props, $store} = exports as UpgradeExports

    const propDefs = makePropDefs($props)
    Object.assign(Upgrade, {
      [PropDefsKey]: propDefs,
      [StoreMakerKey]: $store,
    })

    const propKeys = Object.keys(propDefs)
    const attrKeysOld = Com.observedAttributes ?? []
    const attrKeysNew = propKeys.filter(k => !attrKeysOld.includes(k))
    const attrKeysMerged = [...attrKeysOld, ...attrKeysNew]
    Object.defineProperty(Com, 'observedAttributes', { get() { return attrKeysMerged } })

    for (const k of propKeys) {
      Object.defineProperty(proto, k, {
        configurable: false,
        get() {
          return this[DataKey][k]
        },
        set(newValue) {
          if (propDefs[k].reflect) {
            this.setAttribute(k, newValue)
          } else {
            this[DataKey][k] = propDefs[k].cast?.(newValue) ?? newValue
          }
        },
      })
    }

    proto.$effect = function(f: () => {}) {
      const e = effect(f, this[DataKey])
      this[CleanupKey].push(e)
      return e
    }

    Object.assign(proto, {
      $reactive: reactive,
      $nextTick: nextTick,
      $stopEffect: stop,
    })
  }

  attributeChanged({Com, el: elReal}: PluginCallbackProviderParams): AttributeChangedCallback {
    const {
      [PropDefsKey]: propDefs,
    } = Com as UpgradeComponentConstructor
    const el = elReal as UpgradeComponent

    return (k: string, _oldValue: string | null, newValue: string | null) => {
      if (!(k in propDefs)) {
        return
      }
      if (!el[DataKey]) {
        return
      }
  
      const val = propDefs[k].cast?.(newValue) ?? newValue
      if (val !== el[DataKey][k]) {
        el[DataKey][k] = val
      }
    }
  }

  connected({Com, Raw, shadow, el: elReal}: PluginCallbackProviderParams): ConnectedCallback {
    const {
      [PropDefsKey]: propDefs,
      [StoreMakerKey]: storeMaker,
    } = Com as UpgradeComponentConstructor
    const el = elReal as UpgradeComponent

    return async () => {
      el[CleanupKey] = []
      connectData({
        Raw,
        propDefs,
        storeMaker,
        el,
        shadow,
      })
      await el.$nextTick()
    }
  }

  disconnected({el: elReal}: PluginCallbackProviderParams): DisconnectedCallback {
    const el = elReal as UpgradeComponent
    return () => {
      el[CleanupKey].forEach(stop)
    }
  }
}

function makePropDefs(propsMaker?: PropsMaker): PropDefs {
  const rawDefs = propsMaker?.() ?? {}

  const defs: PropDefs = {}
  Object.entries(rawDefs).map(([k, v]) => {
    if (typeof v !== 'object') {
      v = {
        default: v,
        reflect: PROP_REFLECT_DEFAULT,
      }
    }
    v.default ??= ''
    v.reflect ??= PROP_REFLECT_DEFAULT

    defs[k] = v
  })
  return defs
}

function connectData({Raw, propDefs, storeMaker, el, shadow}: {
  Raw: RawComponentConstructor,
  propDefs: PropDefs,
  storeMaker?: StoreMaker,
  el: UpgradeComponent,
  shadow: ShadowRoot,
}) {
  if (el[DataKey]) { return }

  const r = makeReactive({Raw, propDefs, storeMaker, el})
  Object.assign(el, {
    get [DataKey]() { return r },
  })

  const app = createApp(r)
  app.mount(shadow)
}

function makeReactive({Raw, propDefs, storeMaker, el}: {
  Raw: RawComponentConstructor,
  propDefs: PropDefs,
  storeMaker?: StoreMaker,
  el: UpgradeComponent,
}) {
  const {name} = Raw
  const rawProto = Raw.prototype

  const storeProtos: {[key: string]: any} = {}
  Object.entries(rawProto).forEach(([k, v]) => {
    if (k in StoreSkip) { return }
    if (k.startsWith('$')) { return }
    if (typeof v !== 'function') { return }
    storeProtos[k] = v
  })

  const proxies: any[] = []
  const props = makePropsProxy({proxies, propDefs, el})
  const {sync, persist} = makeStore({proxies, Raw, props, storeMaker, el})
  makeSync({proxies, name, sync})
  makePersist({proxies, name, persist})

  return mergeProxies(proxies)
}

function makeStore({proxies, Raw, el, props, storeMaker}: {
  proxies: any,
  Raw: RawComponentConstructor,
  el: UpgradeComponent,
  props: any,
  storeMaker?: StoreMaker,
}) {
  const rawProto = Raw.prototype

  const d: {[key: string]: any} = {
    get $me() { return el },
  }

  Object.getOwnPropertyNames(rawProto)
    .filter(k => !StoreSkip.has(k))
    .forEach(k => {
      const v = rawProto[k]
      if (typeof v !== 'function') { return }
      if (k.startsWith('$')) { return }
      d[k] = v.bind(el)
    })

  const store = storeMaker?.({
    props,
    persist: (v: any) => new Persist(v),
    sync: (v: any) => new Sync(v),
  }) ?? {}

  const persist: { [key: string]: any} = {}
  const sync: { [key: string]: any} = {}
  for (let [k, v] of Object.entries(store)) {
    if (typeof v === 'function') { throw `VuePlugin: function '${k}' should not be placed directly on the store.` }
    if (k.startsWith('$')) { throw `VuePlugin: don't prefix store names with a '$'.` }

    if (v instanceof Sync) {
      sync[k] = v.v
    } else if (v instanceof Persist) {
      persist[k] = v.v
    } else {
      d[k] = v
    }
  }

  proxies.push(reactive(d))

  return {sync, persist}
}

function makeSync({name, proxies, sync}: {
  name: string,
  proxies: any[],
  sync: object,
}) {
  if (!Object.keys(sync).length) {
    return
  }

  if (!syncMap.has(name)) {
    syncMap.set(name, reactive(sync))
  }
  proxies.push(syncMap.get(name))
}

function makePersist({name, proxies, persist}: {
  name: string,
  proxies: any[],
  persist: object,
}) {
  const persistEntries = Object.entries(persist)
  if (!persistEntries.length) {
    return
  }

  if (!persistMap.has(name)) {
    const storeId = (k: string): string => `${name}-${k}`

    const getItem = (k: string): any => {
      const item = localStorage.getItem(storeId(k))
      return item ? JSON.parse(item) : undefined
    }
    const setItem = (k: string): void => localStorage.setItem(storeId(k), JSON.stringify(r[k]))

    const entries = persistEntries.map(([k, v]): [string, object] => [k, getItem(k) ?? v])

    const r = reactive(Object.fromEntries(entries))
    entries.forEach(([k, v]) => {
      if (typeof v === 'function') { return }
      effect(() => setItem(k))
    })

    persistMap.set(name, r)
  }

  proxies.push(persistMap.get(name))
}

function makePropsProxy({el, proxies, propDefs}: {
  el: HTMLElement,
  proxies: any[],
  propDefs: PropDefs,
}) {
  const entries = Object.entries(propDefs)
  if (!entries.length) {
    return
  }

  const attrs: Record<string, any> = {}
  for (const {name, value} of el.attributes) {
    attrs[name] = value
  }

  const d: { [key: string]: any} = {}
  for (let [k, v] of entries) {
    const raw = attrs[k] ?? v.default ?? ''
    d[k] = v.cast?.(raw) ?? raw
  }

  const r = reactive(d)
  proxies.push(r)
  return r
}

type proxySource = {objects: object[]}

const mergeProxyTrap = {
  ownKeys({ objects }: proxySource) {
    return Array.from(
      new Set(objects.flatMap((i) => Object.keys(i)))
    )
  },

  has({ objects }: proxySource, name: PropertyKey) {
    if (name == Symbol.unscopables) {
      return false
    }

    return objects.some((obj) =>
      Object.prototype.hasOwnProperty.call(obj, name) ||
      Reflect.has(obj, name)
    )
  },

  get({ objects }: proxySource, name: PropertyKey, thisProxy: any) {
    if (name == 'toJSON') {
      return collapseProxies
    }

    return Reflect.get(
      objects.find((obj) => Reflect.has(obj, name)) ?? {},
      name,
      thisProxy,
    )
  },

  set({ objects }: proxySource, name: PropertyKey, value: any, thisProxy: any) {
    const target = objects.find((obj) => Object.prototype.hasOwnProperty.call(obj, name))
      || objects[objects.length - 1]
    const descriptor = Object.getOwnPropertyDescriptor(target, name)

    if (descriptor && descriptor?.set && descriptor?.get) {
      // Can't use Reflect.set here due to [upstream bug](https://github.com/vuejs/core/blob/31abdc8adad569d83b476c340e678c4daa901545/packages/reactivity/src/baseHandlers.ts#L148) in @vue/reactivity
      return descriptor.set.call(thisProxy, value) ?? true
    }
    return Reflect.set(target, name, value)
  },
}

function mergeProxies (objects: object[]) {
  return new Proxy({ objects }, mergeProxyTrap);
}

function collapseProxies(this: object) {
  let keys = Reflect.ownKeys(this)

  return keys.reduce((acc: any, key) => {
    acc[key] = Reflect.get(this, key)
    return acc
  }, {})
}

class StoreValue {
  #v
  constructor(v: any) {
    this.#v = v
  }
  get v() { return this.#v }
}

class Persist extends StoreValue {}
class Sync extends StoreValue {}

type persister = (v: string) => InstanceType<typeof Persist>
type syncer = (v: string) => InstanceType<typeof Sync>

type StoreMaker = (opts: {
  props: Record<string, any>
  persist: persister
  sync: syncer
}) => Record<string, any>

type PropsMaker = () => PropRawDefs

type PropRawDefs = Record<string, PropRawDef>
type PropRawDef = string | PropDef

type PropDef = {
  default: any
  reflect: boolean,
  cast?: (value: any) => any
}
type PropDefs = Record<string, PropDef>

interface UpgradeComponent extends WebComponent {
  [DataKey]: Record<string, any>
  [CleanupKey]: Record<string, any>
  $reactive: () => {}
  $nextTick: () => {}
  $stopEffect: () => {}
}

interface UpgradeComponentConstructor extends WebComponentConstructor {
  new (...args: any[]): UpgradeComponent
  [PropDefsKey]: Record<string, any>
  [StoreMakerKey]?: StoreMaker,
}

type UpgradeExports = ModuleExports & {
  $props?: PropsMaker
  $store?: StoreMaker
}
