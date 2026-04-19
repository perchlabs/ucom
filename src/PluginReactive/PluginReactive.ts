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
  Context,
  DataRecord,
} from './types.ts'
import {
  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  STATIC_OBSERVED_ATTRIBUTES,
} from '../constants.ts'
import {
  isFunction,
  ObjectAssign,
  ObjectKeys,
  ObjectEntriesEach,
  pullKey,
  isSystemKey,
  uniqueArr,
} from '../common.ts'
import {
  computed as $computed,
  signal as $signal,
  effect as $effect,
  effectScope as $effectScope,
  trigger as $trigger,
} from './alien-signals'
import {
  ObjectDefineProperty,
  paramsAttrEach,
} from '../common.ts'
import { createContext } from './context.ts'
import { evaluate } from './expression.ts'
import { walkChildren } from './walk.ts'

// Proto and constructor constants.
const FunctionsIndex = Symbol()
const PropsIndex = Symbol()
// Instance constants.
const ContextIndex = Symbol()
const DataIndex = '$data'

// const PROP_REFLECT_DEFAULT = true

export default {
  async define({Com, Raw, params}: PluginDefineParams) {
    const Upgrade = Com as UpgradeComponentConstructor
    const proto = Upgrade.prototype
    const rawProto = Raw.prototype

    // From user custom prototype.
    const funcs: FunctionRecord = {}
    Object.getOwnPropertyNames(rawProto)
      .filter(k => !isSystemKey(k))
      .forEach(k => {
        const v = rawProto[k]
        if (isFunction(v)) {
          funcs[k] = v
        }
      })

    const propDefs = parseParams(funcs, params)
    ObjectAssign(Upgrade, {
      [FunctionsIndex]: funcs,
      [PropsIndex]: propDefs,
    })

    Com[STATIC_OBSERVED_ATTRIBUTES] = uniqueArr(
      Com[STATIC_OBSERVED_ATTRIBUTES],
      ObjectKeys(propDefs),
    )

    for (const k in propDefs) {
      ObjectDefineProperty(proto, k, {
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

    ObjectAssign(proto, {
      $computed,
      $effect,
      $effectScope,
      $signal,
      $trigger,
    })
  },

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
  },

  [CONNECTED](params: PluginCallbackBuilderParams) {
    const {Com, el, shadow, man} = (params as UpgradedPluginCallbackBuilderParams)
    return () => {
      const ctx = createContext(man, el, shadow, makeContextData(Com, el))
      const {data} = ctx
      ObjectAssign(el, {
        [ContextIndex]: ctx,
        get [DataIndex]() { return data },
      })

      walkChildren(ctx)
    }
  },

  [DISCONNECTED]({el}: PluginCallbackBuilderParams) {
    return () => (el as UpgradeComponent)[ContextIndex].teardown()
  },
} as Plugin

const reParamKey = /^\$([a-z]+)$/

function parseParams(funcs: FunctionRecord, params: Record<string, string>[]) {
  const propDefs: PropDefs = {}

  params.forEach(attrMap => {
    const castVal = pullKey(attrMap, 'cast')
    const cast = castVal
      ? evaluate(castVal, null, funcs) as (value: string) => any
      : undefined

    paramsAttrEach(attrMap, reParamKey, (k, expr) => {
      propDefs[k] = {
        cast,
        default: evaluate(expr, null, funcs),
      }
    })
  })

  return propDefs
}

function makeContextData(
  {
    [FunctionsIndex]: funcs,
    [PropsIndex]: propDefs,
  }: UpgradeComponentConstructor,
  el: UpgradeComponent,
) {
  const data: DataRecord = {...funcs}

  // From property definition.
  ObjectEntriesEach(propDefs, ([k, def]) => {
    const raw = el.getAttribute(k) ?? def.default
    data[k] = def.cast?.(raw) ?? raw
  })

  return data
}

type FunctionRecord = Record<string, (...args: any[]) => any>

type PropDef = {
  default: any
  // TODO: Investigate ways to control reflective attributes/properties
  // reflect: boolean,
  cast?: (value: any) => any
}
type PropDefs = Record<string, PropDef>

interface UpgradeComponent extends WebComponent {
  [ContextIndex]: Context
  [DataIndex]: DataRecord
  $computed: () => any
  $effect: () => any
  $effectScope: () => any
  $signal: () => any
  $trigger: () => any
}

interface UpgradeComponentConstructor extends WebComponentConstructor {
  new (...args: any[]): UpgradeComponent
  [FunctionsIndex]: FunctionRecord
  [PropsIndex]: PropDefs
}

type UpgradedPluginCallbackBuilderParams = {
  Com: UpgradeComponentConstructor;
  Raw: RawComponentConstructor;
  el: UpgradeComponent;
  shadow: ShadowRoot;
  man: ComponentManager,
}
