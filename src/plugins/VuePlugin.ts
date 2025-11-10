import type {
  // ComponentDef,
  RawComponentConstructor,
  WebComponent,
  WebComponentConstructor,
  Plugin,
  PluginDefineParams,
  PluginCallbackBuilderParams,
  ModuleExports,
  AttributeChangedCallback,
  ConnectedCallback,
  DisconnectedCallback,
} from '../ucom'
import {
  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  STATIC_OBSERVED_ATTRIBUTES,
} from '../ucom'
import {createApp, reactive, effect, stop, nextTick} from '../petite-shadow-vue'

// Proto and constructor constants.
const PropsKey = '$props'
const StoreKey = '$store'
// Instance constants.
const DataKey = '$data'
const CleanupKey = Symbol('clean')

const persistMap = new Map<string, any>
const syncMap = new Map<string, any>


// const PROP_REFLECT_DEFAULT = true

export default class VuePlugin implements Plugin {
  async define({Com, exports}: PluginDefineParams) {
    const Upgrade = Com as UpgradeComponentConstructor
    const proto = Upgrade.prototype
    const {$props, $store} = exports as UpgradeExports

    const propDefs = makePropDefs($props)
    Object.assign(Upgrade, {
      [PropsKey]: propDefs,
      [StoreKey]: $store,
    })

    const propKeys = Object.keys(propDefs)
    const attrKeysOld = Com[STATIC_OBSERVED_ATTRIBUTES]
    Com[STATIC_OBSERVED_ATTRIBUTES] = [...new Set([...propKeys, ...attrKeysOld])]

    for (const k of propKeys) {
      Object.defineProperty(proto, k, {
        configurable: false,
        get() {
          return this[DataKey][k]
        },
        set(newValue) {
          this[DataKey][k] = propDefs[k].cast?.(newValue) ?? newValue
        },
        // set(newValue) {
        //   if (propDefs[k].reflect) {
        //     this.setAttribute(k, newValue)
        //   } else {
        //     this[DataKey][k] = propDefs[k].cast?.(newValue) ?? newValue
        //   }
        // },
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

  [ATTRIBUTE_CHANGED]({Com, el: elReal}: PluginCallbackBuilderParams): AttributeChangedCallback {
    const {[PropsKey]: propDefs} = Com as UpgradeComponentConstructor
    const el = elReal as UpgradeComponent

    return (k: string, _oldValue: string | null, newValue: string | null) => {
      const data = el[DataKey]
      if (!data || !(k in propDefs)) {
        return
      }
  
      const val = propDefs[k].cast?.(newValue) ?? newValue
      if (val !== data[k]) {
        data[k] = val
      }
    }
  }

  [CONNECTED]({Com, Raw, shadow, el: elReal}: PluginCallbackBuilderParams): ConnectedCallback {
    const el = elReal as UpgradeComponent
    return async () => {
      if (el[CleanupKey]) { return }
      el[CleanupKey] = []
      connectData(Com as UpgradeComponentConstructor, Raw, el, shadow)
    }
  }

  [DISCONNECTED]({el: elReal}: PluginCallbackBuilderParams): DisconnectedCallback {
    const el = elReal as UpgradeComponent
    return () => el[CleanupKey].forEach(stop)
  }
}

function makePropDefs(propsMaker?: PropsMaker): PropDefs {
  const defs: PropDefs = {}
  Object
    .entries(propsMaker?.() ?? {})
    .map(([k, v]) => {
      if (typeof v === 'object') {
        v.default ??= ''
      } else {
        v = {default: v}
      }
      defs[k] = v
  })
  return defs
}

function connectData(
  Com: UpgradeComponentConstructor,
  Raw: RawComponentConstructor,
  el: UpgradeComponent,
  shadow: ShadowRoot,
) {
  const r = makeReactive(Com, Raw, el)
  Object.assign(el, {
    get [DataKey]() { return r },
  })

  const app = createApp(r)
  app.mount(shadow)
  // TODO: Is this necessary.
  el.$nextTick()
}

function makeReactive(
  Com: UpgradeComponentConstructor,
  Raw: RawComponentConstructor,
  el: UpgradeComponent,
) {
  const {
    def: {name},
    [PropsKey]: propDefs,
    [StoreKey]: storeMaker,
  } = Com
  const proxies: ReactiveProxy[] = []
  const props = makePropsProxy(el, proxies, propDefs)
  const [sync, persist] = makeStore(Raw, el, proxies, props, storeMaker)
  makeSync(name, proxies, sync)
  makePersist(name, proxies, persist)

  return mergeProxies(proxies)
}

type SyncStoreData = Record<string, any>
type PersistStoreData = [k: string, v: any][]

function makeStore(
  Raw: RawComponentConstructor,
  el: UpgradeComponent,
  proxies: any,
  props: any,
  storeMaker?: StoreMaker,
): [SyncStoreData, PersistStoreData] {
  const rawProto = Raw.prototype

  const d: Record<string, any> = {
    get $me() { return el },
  }

  Object.getOwnPropertyNames(rawProto)
    .forEach(k => {
      const v = rawProto[k]
      if (isFunc(v)) {
        d[k] = v.bind(el)
      }
    })

  const store = storeMaker?.({
    props,
    persist: (v: any) => new Persist(v),
    sync: (v: any) => new Sync(v),
  }) ?? {}

  const sync: SyncStoreData = {}
  const persist: PersistStoreData = []
  for (let [k, v] of Object.entries(store)) {
    if (v instanceof Sync) {
      sync[k] = v.v
    } else if (v instanceof Persist) {
      persist.push([k, v.v])
    } else {
      d[k] = v
    }
  }

  proxies.push(reactive(d))

  return [sync, persist]
}

function makeSync(name: string, proxies: ReactiveProxy[], sync: SyncStoreData) {
  if (!Object.keys(sync).length) {
    return
  }

  if (!syncMap.has(name)) {
    syncMap.set(name, reactive(sync))
  }
  proxies.push(syncMap.get(name))
}

function makePersist(name: string, proxies: ReactiveProxy[], persist: PersistStoreData) {
  if (!persist.length) {
    return
  }

  if (!persistMap.has(name)) {
    const storeId = (k: string): string => `${name}-${k}`
    const getItem = (k: string): any => {
      const item = localStorage.getItem(storeId(k))
      return item ? JSON.parse(item) : undefined
    }
    const setItem = (k: string): void => localStorage.setItem(storeId(k), JSON.stringify(r[k]))

    const entries = persist.map(([k, v]) => [k, getItem(k) ?? v])
    const r = reactive(Object.fromEntries(entries))
    entries.forEach(([k, v]) => {
      if (!isFunc(v)) {
        effect(() => setItem(k))
      }
    })

    persistMap.set(name, r)
  }

  proxies.push(persistMap.get(name))
}

const isFunc = (v: any) => typeof v === 'function'

function makePropsProxy(el: HTMLElement, proxies: ReactiveProxy[], propDefs: PropDefs) {
  const entries = Object.entries(propDefs)
  if (!entries.length) {
    return
  }

  const attrs: Record<string, any> = {}
  for (const {name, value} of el.attributes) {
    attrs[name] = value
  }

  const d: Record<string, any> = {}
  for (let [k, v] of entries) {
    const raw = attrs[k] ?? v.default
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

function mergeProxies(objects: ReactiveProxy[]) {
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
  v: any
  constructor(v: any) {
    this.v = v
  }
}
class Persist extends StoreValue {}
class Sync extends StoreValue {}

type persister = (v: string) => InstanceType<typeof Persist>
type syncer = (v: string) => InstanceType<typeof Sync>

type ReactiveProxy = ReturnType<typeof reactive>

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
  // TODO: Investigate ways to control reflective attributes/properties
  // reflect: boolean,
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
  [PropsKey]: Record<string, any>
  [StoreKey]?: StoreMaker,
}

type UpgradeExports = ModuleExports & {
  $props?: PropsMaker
  $store?: StoreMaker
}
