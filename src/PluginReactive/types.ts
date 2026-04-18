import type { ComponentManager } from '../types.ts'

export type DataRecord = Record<string, any>
export type ComputedFunction = () => any

export interface Context {
  man: ComponentManager
  walkable: ContextableNode
  start: Node
  refs: RefRecord
  cleanup: (() => void)[]

  effect: (fn: () => void) => void

  teardownCallback?(): void
  mount(root: ContextableNode, anchor: Node): void
  scope(el: Element, data?: DataRecord): Context
  remove(): void
  teardown(): void

  data: DataRecord
  var: StoreAdder
  calc: StoreAdder
  sync: StoreAdder
  save: StoreAdder
}
export type StoreAdder = (key: string, val: any) => void

// ContextableNode should use Element so that SVGElement is considered.
export type ContextableNode = DocumentFragment | Element
export type RefRecord = Record<string, WeakRef<ContextableNode>>

export type DirectiveDef = {
  full: string
  key: string
  expr: string
  ref?: string
  mods: Set<string>
}
export type DirectiveHandler = (ctx: Context, dir: DirectiveDef, el: Element)
  => WalkableReturnType
export type WalkableReturnType = Element | undefined | null | void
