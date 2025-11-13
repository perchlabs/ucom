import type {
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
  CUSTOM_CALLBACKS,
  STATIC_OBSERVED_ATTRIBUTES,
} from '../ucom'
import {createApp, ref, reactive, effect, stop, nextTick} from '../petite-shadow-vue'

// Proto and constructor constants.
const PropsKey = '$props'
const StoreKey = '$store'
// Instance constants.
const DataKey = '$data'
const CleanupKey = Symbol('clean')

const persistMap: Record<string, any> = {}
const syncMap: Record<string, any> = {}

const storeProhibitedFunctions = new Set(['constructor', ...CUSTOM_CALLBACKS])

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
): ReactiveProxy {
  const {
    def: {name},
    [PropsKey]: propDefs,
    [StoreKey]: storeMaker,
  } = Com
  const props = makeProps(el, propDefs)
  return makeStore(Raw, name, el, props, storeMaker)
}

function makeStore(
  Raw: RawComponentConstructor,
  name: string,
  el: UpgradeComponent,
  props: any,
  storeMaker?: StoreMaker,
): ReactiveProxy {
  const rawProto = Raw.prototype

  const d: Record<string, any> = {
    ...props,
    get $me() { return el },
  }

  const store = storeMaker?.({
    props,
    persist: (v: any) => new Persist(v),
    sync: (v: any) => new Sync(v),
  }) ?? {}
  Object.getOwnPropertyNames(rawProto)
    .filter(k => !storeProhibitedFunctions.has(k))
    .forEach(k => {
      const v = rawProto[k]
      if (typeof v === 'function') {
        d[k] = v.bind(el)
      }
    })

  for (let [k, v] of Object.entries(store)) {
    if (v instanceof Sync) {
      d[k] = makeSync(name, k, v)
    } else if (v instanceof Persist) {
      d[k] = makePersist(name, k, v)
    } else {
      d[k] = v
    }
  }

  return reactive(d)
}

function makeSync(name: string, key: string, sync: Sync) {
  const storeId = `${name}-${key}`

  if (!(storeId in syncMap)) {
    syncMap[storeId] = ref(sync.v)
  }
  return syncMap[storeId]
}

function makePersist(name: string, key: string, persist: Persist) {
  const storeId = `${name}-${key}`

  if (!(storeId in persistMap)) { 
    const getItem = () => {
      const item = localStorage.getItem(storeId)
      return item ? JSON.parse(item) : undefined
    }

    const rf = ref(getItem() ?? persist.v)
    persistMap[storeId] = rf

    const setItem = () => localStorage.setItem(storeId, JSON.stringify(rf.value))
    effect(() => setItem())
  }

  return persistMap[storeId]
}


function makeProps(el: HTMLElement, propDefs: PropDefs) {
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

  return d
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
