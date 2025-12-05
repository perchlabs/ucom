import type {
  RawComponentConstructor,
  WebComponent,
  WebComponentConstructor,
  Plugin,
  PluginDefineParams,
  PluginCallbackBuilderParams,
  ModuleExports,
  // AttributeChangedCallback,
  // ConnectedCallback,
  // DisconnectedCallback,
} from '../types.ts'
import type {
  ValueWrapper,
  persister,
  syncer,
  computer,
  ComputedFunctionMaker,
  ProxyRecord,
} from './types'
import {
  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  STATIC_OBSERVED_ATTRIBUTES,
  isSystemKey,
} from '../common.ts'
import {
  computed as $computed,
  signal as $signal,
  effect as $effect,
  effectScope as $effectScope,
  trigger as $trigger,
} from './alien-signals'
import { cleanup, createRootContext } from './context.ts'
import { walkChildren } from './walk.ts'
import { createStore } from './store.ts'

// Proto and constructor constants.
const PropsIndex = Symbol()
const StoreIndex = Symbol()
// Instance constants.
const CleanupIndex = Symbol()
const DataIndex = '$data'

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

    Object.assign(proto, {
      $computed,
      $effect,
      $effectScope,
      $signal,
      $trigger,
    })
  }

  [ATTRIBUTE_CHANGED]({Com, el}: PluginCallbackBuilderParams) {
    const {[PropsIndex]: propDefs} = Com as UpgradeComponentConstructor

    return (k: string, _oldValue: string | null, newValue: string | null) => {
      const data = (el as UpgradeComponent)[DataIndex]
      const propDef = propDefs[k]
      if (!data || !propDef) {
        return
      }

      const val = propDef.cast?.(newValue) ?? newValue
      if (val !== data[k]) {
        data[k] = val
      }
    }
  }

  [CONNECTED](params: PluginCallbackBuilderParams) {
    return () => connectData(params as UpgradedPluginCallbackBuilderParams)
  }

  [DISCONNECTED]({el}: PluginCallbackBuilderParams) {
    return () => (el as UpgradeComponent)[CleanupIndex]?.forEach(f => f())
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

function connectData({Com, Raw, el, shadow}: UpgradedPluginCallbackBuilderParams) {
  if (el[CleanupIndex]) {
    return
  }
  el[CleanupIndex] = []

  const ctx = createRootContext(shadow, makeStore(Com, Raw, el))
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
  const store = createStore(el, name)
  const props = makeProps(el, propDefs)

  store.addRaw(props)
  Object.getOwnPropertyNames(rawProto)
    .filter(k => !isSystemKey(k))
    .forEach(k => {
      const v = rawProto[k]
      if (typeof v === 'function') {
        store.add(k, v)
      }
    })

  const raw = userDefinedStore?.({
    props,
    persisted: (v: any) => new Persisted(v),
    synced: (v: any) => new Synced(v),
    computed: (v: ComputedFunctionMaker) => new Computed(v)
  }) ?? {}

  for (const [k, v] of Object.entries(raw)) {
    if (v instanceof Computed) {
      store.computed(k, v.v)
    } else if (v instanceof Synced) {
      store.sync(k, v.v)
    } else if (v instanceof Persisted) {
      store.persist(k, v.v)
    } else {
      store.add(k, v)
    }
  }

  return store
}

function makeProps(el: UpgradeComponent, propDefs: PropDefs) {
  const d: Record<string, any> = {
    // get $el() { return el },
  }
  for (let [k, v] of Object.entries(propDefs)) {
    const raw = el.getAttribute(k) ?? v.default
    d[k] = v.cast?.(raw) ?? raw
  }
  return d
}

class StoreValue<T = any> implements ValueWrapper<T> {
  v: T
  constructor(v: T) {
    this.v = v
  }
}
export class Synced extends StoreValue {}
export class Persisted extends StoreValue {}
export class Computed extends StoreValue<ComputedFunctionMaker>{}

type StoreMaker = (opts: {
  props: Record<string, string>
  persisted: persister
  synced: syncer
  computed: computer
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
  [DataIndex]: ProxyRecord
  [CleanupIndex]: (() => void)[]
  $computed: () => any
  $effect: () => any
  $effectScope: () => any
  $signal: () => any
  $trigger: () => any
}

interface UpgradeComponentConstructor extends WebComponentConstructor {
  new (...args: any[]): UpgradeComponent
  [PropsIndex]: PropDefs
  [StoreIndex]?: StoreMaker
}

type UpgradeExports = ModuleExports & {
  $props?: PropsMaker
  $store?: StoreMaker
}

type UpgradedPluginCallbackBuilderParams = {
  Com: UpgradeComponentConstructor;
  Raw: RawComponentConstructor;
  el: UpgradeComponent;
  shadow: ShadowRoot;
}