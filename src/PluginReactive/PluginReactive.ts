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
  ProxyRecord,
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
  isSystemKey,
  uniqueArr,
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
  ObjectDefineProperty,
  attributeEntries,
  pullAttr,
} from '../common.ts'
import { createContext } from './context.ts'
import { evaluate } from './expression.ts'
import { walkChildren } from './walk.ts'

// Proto and constructor constants.
const PropsIndex = Symbol()
// Instance constants.
const ContextIndex = Symbol()
const DataIndex = '$data'

// const PROP_REFLECT_DEFAULT = true
const reParamKey = /^\$([a-z]+)$/

function parseParams(frag: DocumentFragment) {
  const propDefs: PropDefs = {}
  for (const el of getTopLevelChildren<HTMLParamElement>(frag, 'PARAM')) {
    el.remove()

    const castVal = pullAttr(el, 'cast')
    const cast = castVal
      ? evaluate(`${castVal}`) as (value: string) => any
      : undefined

    attributeEntries(el)
      .forEach(([line, expr]) => {
        const k = line.match(reParamKey)?.[1]
        if (k) {
          propDefs[k] = {
            cast,
            default: evaluate(expr),
          }
        }
      })
  }

  return propDefs
}

export default class implements Plugin {
  async define({Com, frag}: PluginDefineParams) {
    const Upgrade = Com as UpgradeComponentConstructor
    const proto = Upgrade.prototype
    const propDefs = parseParams(frag)

    ObjectAssign(Upgrade, {
      [PropsIndex]: propDefs,
    })

    const propKeys = ObjectKeys(propDefs)
    const attrKeysOld = Com[STATIC_OBSERVED_ATTRIBUTES]
    Com[STATIC_OBSERVED_ATTRIBUTES] = uniqueArr(propKeys, attrKeysOld)

    for (const k of propKeys) {
      ObjectDefineProperty(proto, k, {
        // configurable: false,
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
    const {Com, Raw, el, shadow, man} = (params as UpgradedPluginCallbackBuilderParams)
    return () => {
      const ctx = createContext(man, el, shadow, makeContextData(Com, Raw, el))
      const {data} = ctx
      ObjectAssign(el, {
        [ContextIndex]: ctx,
        get [DataIndex]() { return data },
      })

      walkChildren(ctx)
    }
  }

  [DISCONNECTED]({el}: PluginCallbackBuilderParams) {
    return () => (el as UpgradeComponent)[ContextIndex].teardown()
  }
}

function makeContextData(
  {[PropsIndex]: propDefs}: UpgradeComponentConstructor,
  {prototype: rawProto}: RawComponentConstructor,
  el: UpgradeComponent,
) {
  const data: ProxyRecord = {}

  // From property definition.
  ObjectEntriesEach(propDefs, ([k, def]) => {
    const raw = el.getAttribute(k) ?? def.default
    data[k] = def.cast?.(raw) ?? raw
  })

  // From user custom prototype.
  Object.getOwnPropertyNames(rawProto)
    .filter(k => !isSystemKey(k))
    .forEach(k => {
      const v = rawProto[k]
      if (isFunction(v)) {
        data[k] = v
      }
    })

  return data
}

type PropDef = {
  default: any
  // TODO: Investigate ways to control reflective attributes/properties
  // reflect: boolean,
  cast?: ((value: any) => any)
}
type PropDefs = Record<string, PropDef>

interface UpgradeComponent extends WebComponent {
  [ContextIndex]: Context
  [DataIndex]: ProxyRecord
  $computed: () => any
  $effect: () => any
  $effectScope: () => any
  $signal: () => any
  $trigger: () => any
}

interface UpgradeComponentConstructor extends WebComponentConstructor {
  new (...args: any[]): UpgradeComponent
  [PropsIndex]: PropDefs
}

type UpgradedPluginCallbackBuilderParams = {
  Com: UpgradeComponentConstructor;
  Raw: RawComponentConstructor;
  el: UpgradeComponent;
  shadow: ShadowRoot;
  man: ComponentManager,
}
