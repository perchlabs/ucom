import type {
  ComponentManager,
  DirectiveDef,
} from '../reference.ts'

export type DataRecord = Record<string, any>
export type ComputedFunction = () => any

export interface Context {
  man: ComponentManager
  walkable: ContextableNode
  start: Text | ContextableNode

  mount(root: ContextableNode, anchor: Node): Context
  scope(el: Element, data?: DataRecord): Context
  teardown(): void

  push: (fn: () => void) => void
  effect: (fnEffect: () => void, fnCleanup?: () => void) => void

  eval: (exp: string, data?: DataRecord | null) => unknown
  data: DataRecord
  var: StoreAdder
  calc: StoreAdder
  sync: StoreAdder
  save: StoreAdder

  refs: RefRecord
}
// ContextableNode should use Element so that SVGElement is considered.
export type ContextableNode = DocumentFragment | Element
export type StoreAdder = (entry: StoreAdderEntry) => void
export type StoreAdderEntry = [key: string, val: any]
export type RefRecord = Record<string, WeakRef<ContextableNode>>

// export type WalkableReturn = Element | undefined | null
export type WalkableReturn = Element | undefined | void | null
export type DirectiveHandler = (ctx: Context, el: Element, dir: DirectiveDef)
  => WalkableReturn
