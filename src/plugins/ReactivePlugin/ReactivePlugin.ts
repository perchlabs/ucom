import type {
  RawComponentConstructor,
  WebComponent,
  WebComponentConstructor,
  Plugin,
  PluginDefineParams,
  PluginCallbackBuilderParams,
  ModuleExports,
  PluginConstructParams,
  // AttributeChangedCallback,
  // ConnectedCallback,
  // DisconnectedCallback,
} from '../../core'
import type {
  ProxyRef, 
  ProxyRefRecord,
  SignalRecord,
} from './types'
import {
  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  CUSTOM_CALLBACKS,
  STATIC_OBSERVED_ATTRIBUTES,
} from '../../core'
import { computed, effect } from './alien-signals'
import { cleanup, createContext } from './context.ts'
import { walkChildren } from './walk.ts'
import { makeProxyRef, createProxyStore, createProxyRefs } from './store.ts'

// Proto and constructor constants.
const PropsIndex = '$props'
const StoreIndex = '$store'
// Instance constants.
const CleanupIndex = Symbol()
const DataIndex = '$data'

const persistMap: ProxyRefRecord = {}
const syncMap: ProxyRefRecord = {}

const storeProhibitedFunctions = new Set(['constructor', ...CUSTOM_CALLBACKS])

// const PROP_REFLECT_DEFAULT = true

export default class implements Plugin {
  async define({Com, exports}: PluginDefineParams) {
    const Upgrade = Com as UpgradeComponentConstructor
    const proto = Upgrade.prototype
    const {$props, $store} = exports as UpgradeExports

    const propDefs = makePropDefs($props)
    Object.assign(Upgrade, {
      [PropsIndex]: propDefs,
      [StoreIndex]: $store,
    })

    const propKeys = Object.keys(propDefs)
    const attrKeysOld = Com[STATIC_OBSERVED_ATTRIBUTES]
    Com[STATIC_OBSERVED_ATTRIBUTES] = [...new Set([...propKeys, ...attrKeysOld])]

    for (const k of propKeys) {
      Object.defineProperty(proto, k, {
        configurable: false,
        get() {
          return this[DataIndex][k]
        },
        set(newValue) {
          this[DataIndex][k] = propDefs[k].cast?.(newValue) ?? newValue
        },
        // set(newValue) {
        //   if (propDefs[k].reflect) {
        //     this.setAttribute(k, newValue)
        //   } else {
        //     this[DataIndex][k] = propDefs[k].cast?.(newValue) ?? newValue
        //   }
        // },
      })
    }

    proto.$effect = function(f: () => {}) {
      this[CleanupIndex].push(effect(f))
    }

    Object.assign(proto, {
      $computed: computed,
    })
  }

  [ATTRIBUTE_CHANGED]({Com, el}: PluginCallbackBuilderParams) {
    const {[PropsIndex]: propDefs} = Com as UpgradeComponentConstructor
    const up = el as UpgradeComponent

    return (k: string, _oldValue: string | null, newValue: string | null) => {
      const data = up[DataIndex]
      if (!data) {
        return
      }

      const propDef = propDefs[k]
      if (!propDef) {
        return
      }

      const val = propDef.cast?.(newValue) ?? newValue
      if (val !== data[k]) {
        data[k] = val
      }
    }
  }

  [CONNECTED]({Com, Raw, shadow, el: elReal}: PluginCallbackBuilderParams) {
    const el = elReal as UpgradeComponent
    return async () => {
      connectData(Com as UpgradeComponentConstructor, Raw, el as UpgradeComponent, shadow)
    }
  }

  [DISCONNECTED]({el: elReal}: PluginCallbackBuilderParams) {
    const el = elReal as UpgradeComponent
    return () => el[CleanupIndex]?.forEach(f => f())
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
  if (el[CleanupIndex]) {
    return
  }
  el[CleanupIndex] = []

  const ctx = createContext(shadow, makeStore(Com, Raw, el))
  Object.assign(el, {
    get [DataIndex]() { return ctx.data },
  })
  walkChildren(ctx, shadow)

  el[CleanupIndex].push?.(() => cleanup(ctx.el))
}

function makeStore(
  Com: UpgradeComponentConstructor,
  {prototype: rawProto}: RawComponentConstructor,
  el: UpgradeComponent,
) {
  const {
    def: {name},
    [PropsIndex]: propDefs,
    [StoreIndex]: userDefinedStore,
  } = Com
  const props = makeProps(el, propDefs)
  const refs = createProxyRefs(props)

  Object.getOwnPropertyNames(rawProto)
    .filter(k => !storeProhibitedFunctions.has(k))
    .forEach(k => {
      const v = rawProto[k]
      if (typeof v === 'function') {
        refs[k] = makeProxyRef(k, v)
      }
    })

  const data = userDefinedStore?.({
    props,
    persist: (v: any) => new Persist(v),
    sync: (v: any) => new Sync(v),
  }) ?? {}
  for (let [k, v] of Object.entries(data)) {
    let ref: ProxyRef | undefined
    if (v instanceof Sync) {
      ref = makeSync(name, k, v)
    } else if (v instanceof Persist) {
      ref = makePersist(name, k, v)
    } else {
      ref = makeProxyRef(k, v)
    }

    if (!ref) {
      console.error(`component '${name}' has a problem on key '${k}'`)
      continue
    }

    refs[k] = ref
  }

  return createProxyStore(el, refs)
}

function makeProps(el: UpgradeComponent, propDefs: PropDefs) {
  const d: Record<string, any> = {
    get $me() { return el },
  }
  for (let [k, v] of Object.entries(propDefs)) {
    const raw = el.getAttribute(k) ?? v.default
    d[k] = v.cast?.(raw) ?? raw
  }
  return d
}

function makeSync(name: string, key: string, sync: Sync) {
  const storeId = `${name}-${key}`
  if (!(storeId in syncMap)) {
    syncMap[storeId] = makeProxyRef(key, sync.v)
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

    const ref = makeProxyRef(key, getItem() ?? persist.v)
    persistMap[storeId] = ref

    if (!ref.item) {
      return
    }
    const get = ref.item
    const setItem = () => localStorage.setItem(storeId, JSON.stringify(get()))
    effect(() => setItem())
  }

  return persistMap[storeId]
}

class StoreValue<T = any> {
  v: T
  constructor(v: T) {
    this.v = v
  }
}

class Persist extends StoreValue {}
type persister = (v: string) => InstanceType<typeof Persist>

class Sync extends StoreValue {}
type syncer = (v: string) => InstanceType<typeof Sync>

type ComputedFunction = () => any
type ComputedWrapper = ($data: SignalRecord) => ComputedFunction
class Computed extends StoreValue<ComputedWrapper>{}
type computer = (v: ComputedWrapper) => InstanceType<typeof Computed>

type StoreMaker = (opts: {
  props: Record<string, string>
  persist: persister
  sync: syncer
  compute?: computer
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
  [DataIndex]: Record<string, any>
  [CleanupIndex]: (() => void)[]
  $computed: () => any
  $effect: () => any
}

interface UpgradeComponentConstructor extends WebComponentConstructor {
  new (...args: any[]): UpgradeComponent
  [PropsIndex]: Record<string, any>
  [StoreIndex]?: StoreMaker,
}

type UpgradeExports = ModuleExports & {
  $props?: PropsMaker
  $store?: StoreMaker
}
