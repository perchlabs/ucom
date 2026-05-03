import type {
  ComponentManager,
  RawComponentConstructor,
  WebComponent,
  WebComponentConstructor,
  Plugin,
  PluginDefineParams,
  PluginCallbackBuilderParams,
  ComponentParams,
  // AttributeChangedCallback,
  // ConnectedCallback,
  // DisconnectedCallback,
} from '../reference.ts'
import type {
  Context,
  DataRecord,
} from './reference.ts'
import {
  ATTRIBUTE_CHANGED,
  CONNECTED,
  DISCONNECTED,
  STATIC_OBSERVED_ATTRIBUTES,
} from '../reference.ts'
import {
  isFunction,
  ArrayFrom,
  ObjectAssign,
  ObjectKeys,
  ObjectEntriesEach,
  isUserKey,
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
      .filter(isUserKey)
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

    ObjectEntriesEach(propDefs, ([_kebab, [camel, pipe]]) => {
      ObjectDefineProperty(proto, camel, {
        get() {
          return this[DataIndex][camel]
        },
        set(newValue) {
          this[DataIndex][camel] = pipe(newValue)
        },
        // set(newValue) {
        //   if (propDefs[k].reflect) {
        //     this.setAttribute(k, newValue)
        //   } else {
        //     this[DataIndex][k] = pipe(newValue)
        //   }
        // },
      })

    })

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

    return (kebab: string, _oldValue: string | null, newValue: string | null) => {
      const data = (el as UpgradeComponent)[DataIndex]
      const [camel, pipe] = propDefs[kebab]

      if (data && camel) {
        data[camel] = pipe(newValue)
      }
    }
  },

  [CONNECTED](params: PluginCallbackBuilderParams) {
    const {Com, man, el, root} = (params as UpgradedPluginCallbackBuilderParams)
    return () => {
      const ctx = createContext(man, el, root, makeContextData(Com, el))
      ObjectAssign(el, {
        [ContextIndex]: ctx,
        get [DataIndex]() { return ctx.data },
      })

      walkChildren(ctx)
    }
  },

  [DISCONNECTED]({el}: PluginCallbackBuilderParams) {
    return () => (el as UpgradeComponent)[ContextIndex].teardown()
  },
} as Plugin

function parseParams(funcs: FunctionRecord, params: ComponentParams): PropDefs {
  const propDefs: PropDefs = {}

  for (const dir of ArrayFrom(params)) {
    const {op, camel, kebab, expr, mods} = dir

    if (op === '$' && kebab && camel) {
      params.delete(dir)

      const eVal = expr ? evaluate(expr, null, funcs) : undefined
      let pipe: (v: any) => any

      if (mods.has('int')) {
        pipe = v => Math.round(Number(v ?? eVal) || 0)
      } else if (mods.has('bool')) {
        if (expr) {
          console.warn(`bool parameter '${camel}' cannot have default value`)
        }
        pipe = v => v != null
      } else {
        pipe = isFunction(eVal) ? eVal : v => v ?? eVal
      }

      propDefs[kebab] = [camel, pipe]
    }
  }

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
  ObjectEntriesEach(propDefs, ([kebab, [camel, pipe]]) => {
    data[camel] = pipe(el.getAttribute(kebab))
  })
  return data
}

type FunctionRecord = Record<string, (...args: any[]) => any>

type PropDefs = Record<string, PropDef>
type PropDef = [
  camel: string,
  pipe: (v: string | null) => any,

]

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
  Com: UpgradeComponentConstructor
  Raw: RawComponentConstructor
  el: UpgradeComponent
  root: ShadowRoot
  man: ComponentManager
}
