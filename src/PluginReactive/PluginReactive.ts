import type {
  ComponentManager,
  RawComponentConstructor,
  WebComponent,
  WebComponentConstructor,
  Plugin,
  PluginDefineParams,
  PluginCallbackBuilderParams,
  // ModuleExports,
  // AttributeChangedCallback,
  // ConnectedCallback,
  // DisconnectedCallback,

} from '../types.ts'
import type {
  ValueWrapper,
  // persister,
  // syncer,
  // computer,
  ComputedFunctionMaker,
  ProxyRecord,
  ParamVarDef,
} from './types'
import {
  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  STATIC_OBSERVED_ATTRIBUTES,

  PARAM_MOD_PROP,
  PARAM_MOD_COMP,
  PARAM_MOD_SYNC,
  PARAM_MOD_SAVE,
} from '../constants.ts'
import {
  isSystemKey,
  getTopLevelChildren,
} from '../common.ts'
import {
  computed as $computed,
  signal as $signal,
  effect as $effect,
  effectScope as $effectScope,
  trigger as $trigger,
} from './alien-signals'
import {
  parseParam,
} from './utils.ts'
import { cleanup, createContext } from './context.ts'
import { evaluate } from './expression.ts'
import { walkChildren } from './walk.ts'
import { createStore } from './store.ts'

// Proto and constructor constants.
const PropsIndex = Symbol()
const StoreIndex = Symbol()
// Instance constants.
const CleanupIndex = Symbol()
const DataIndex = '$data'

// const PROP_REFLECT_DEFAULT = true

function parseParams(frag: DocumentFragment) {
  const paramVarDefs: ReturnType<typeof parseParam> = {}

  const params = getTopLevelChildren<HTMLParamElement>(frag, 'PARAM')
  for (const el of params) {
    Object.assign(paramVarDefs, parseParam(el, frag))
    el.remove()
  }

  const entries = Object.values(paramVarDefs)
  const {props = [], store = []} = Object.groupBy(entries, ({mod}) => mod === PARAM_MOD_PROP ? 'props' : 'store')
  const propDefs: PropDefs = {}
  for (const {k, expr, cast} of props) {
    propDefs[k] = {
      cast,
      default: evaluate(expr, {}),
    }
  }

  return {propDefs, store}
}

export default class implements Plugin {
  async define({Com, frag}: PluginDefineParams) {
    const Upgrade = Com as UpgradeComponentConstructor
    const proto = Upgrade.prototype
    const {propDefs, store} = parseParams(frag)

    Object.assign(Upgrade, {
      [PropsIndex]: propDefs,
      [StoreIndex]: store,
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

function connectData({Com, Raw, el, shadow, man}: UpgradedPluginCallbackBuilderParams) {
  if (el[CleanupIndex]) {
    return
  }
  el[CleanupIndex] = []

  const ctx = createContext(shadow, man, makeProxyStore(Com, Raw, el))
  Object.assign(el, {
    get [DataIndex]() { return ctx.data },
  })
  walkChildren(shadow, ctx)

  el[CleanupIndex].push?.(() => cleanup(ctx.el))
}

function makeProxyStore(
  Com: UpgradeComponentConstructor,
  {prototype: rawProto}: RawComponentConstructor,
  el: UpgradeComponent,
) {
  const {
    def: {name},
    [PropsIndex]: propDefs,
    [StoreIndex]: storeDef,
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

  for (let {k, mod, expr} of storeDef) {
    switch (mod) {
      case PARAM_MOD_COMP: {
        // expr = `() => ${expr}`
        let val = evaluate(expr, store.data)
        // if (typeof val === 'function') {
        //   val = evaluate(val(), store.data)
        // }

        store.computed(k, val)
        break
      }
      case PARAM_MOD_SYNC: {
        const val = evaluate(expr, {})
        store.sync(k, val)
        break
      }
      case PARAM_MOD_SAVE: {
        const val = evaluate(expr, {})
        store.persist(k, val)
        break
      }
      default: {
        const val = evaluate(expr, {})
        store.add(k, val)
      }
    }
  }

  return store.data
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

type PropDef = {
  default: any
  // TODO: Investigate ways to control reflective attributes/properties
  // reflect: boolean,
  cast?: null | ((value: any) => any)
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
  [StoreIndex]: ParamVarDef[]
}

type UpgradedPluginCallbackBuilderParams = {
  Com: UpgradeComponentConstructor;
  Raw: RawComponentConstructor;
  el: UpgradeComponent;
  shadow: ShadowRoot;
  man: ComponentManager,
}
