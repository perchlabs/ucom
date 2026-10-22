import type {
  ComponentManager,
  DirectiveDef,
} from '../reference.ts'

export type DataRecord = Record<string | symbol, any>
export type ComputedFunction = () => any

export type EffectFunc =
  (() => void) |
  (() => (() => void)) |
  (() => Promise<void>)

export interface Context {
  man: ComponentManager
  ptr: ContextableNode
  walkable: ContextableNode
  start: Text | ContextableNode

  mount(root: ContextableNode, anchor: Node): Context
  scope(el: Element, data?: DataRecord): Context
  teardown(): void

  push: (fn: () => void) => void
  effect: (fn: EffectFunc, cleanup?: () => void) => void
  eval: (exp: string | symbol, data?: DataRecord | null) => unknown
  data: DataRecord
  var: StoreAdder
  calc: StoreAdder
  sync: StoreAdder
  save: StoreAdder
}
// ContextableNode should use Element so that SVGElement is considered.
export type ContextableNode = DocumentFragment | Element
export type StoreAdder = (entry: StoreAdderEntry) => void
export type StoreAdderEntry = [key: string | symbol, val: any]

export type WalkableReturn = Element | undefined | void | null

export type BranchDirectiveHandler = (ctx: Context, el: Element, dir: DirectiveDef)
  => WalkableReturn

export type DirectiveHandler = (ctx: Context, el: Element, dir: DirectiveDef)
  => undefined | void | null


export const STORE_MOD_VAR = 'var'
export const STORE_MOD_CALC = 'calc'
export const STORE_MOD_SYNC = 'sync'
export const STORE_MOD_SAVE = 'save'
export type STORE_TYPE = typeof STORE_MOD_VAR | typeof STORE_MOD_CALC | typeof STORE_MOD_SYNC | typeof STORE_MOD_SAVE
export const storeMods = new Set<STORE_TYPE>([STORE_MOD_VAR, STORE_MOD_CALC, STORE_MOD_SYNC, STORE_MOD_SAVE])


export const TEXT_MOD_HTML = 'html'
// orientation
export const TEXT_MOD_INNER = 'inner'
export const TEXT_MOD_OUTER = 'outer'
export const TEXT_MOD_APPEND = 'append'
export const TEXT_MOD_PREPEND = 'prepend'

export const STORE_DEFAULT_INDEX = Symbol()
