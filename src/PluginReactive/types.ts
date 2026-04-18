import type { ComponentManager } from '../types.ts'
import type { signal} from './alien-signals'

export type Signal = ReturnType<typeof signal>
export type ProxyRecord = Record<string, any>
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
  scope(el: HTMLElement, data?: ProxyRecord): Context
  remove(): void
  teardown(): void

  data: ProxyRecord
  var: StoreAdder
  calc: StoreAdder
  sync: StoreAdder
  save: StoreAdder
}
export type StoreAdder = (key: string, val: any) => void
export type ContextableNode = DocumentFragment | HTMLElement
export type RefRecord = Record<string, WeakRef<ContextableNode>>

export type DirectiveDef = {
  full: string
  key: string
  expr: string
  ref?: string
  // mod?: string
  mods: Set<string>
}
export type DirectiveHandler = (ctx: Context, dir: DirectiveDef, el: HTMLElement)
  => DirectiveHandlerReturn
export type DirectiveHandlerReturn = HTMLElement | undefined | null | void
