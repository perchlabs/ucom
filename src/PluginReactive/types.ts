import type { ComponentManager } from '../types.ts'
import type { signal} from './alien-signals'

export type Signal = ReturnType<typeof signal>
export type ProxyRecord = Record<string, any>
export type ComputedFunction = () => any

export interface Store {
  data: ProxyRecord
  cleanup(): void

  var: StoreAdder
  calc: StoreAdder
  sync: StoreAdder
  save: StoreAdder
  varRaw: (raw: ProxyRecord) => void
  copy: (dataNew?: ProxyRecord) => Store
}

export type StoreAdder = (key: string, val: any) => void



export interface Context {
  man: ComponentManager
  store: Store
  refs: RefRecord
  cleanup: (() => void)[]

  walkable: ContextableNode
  start: Node

  // children: Set<Context>

  teardownCallback?(): void
  mount(root: ContextableNode, anchor: Node): void
  scope(el: HTMLElement, data?: ProxyRecord): Context
  remove(): void
  teardown(): void
}
export type ContextableNode = DocumentFragment | HTMLElement
export type RefRecord = Record<string, WeakRef<ContextableNode>>

export type DirectiveDef = {
  full: string
  key: string
  expr: string
  ref?: string
  mod?: string
}
export type DirectiveHandler = (ctx: Context, dir: DirectiveDef, el: HTMLElement)
  => DirectiveHandlerReturn
export type DirectiveHandlerReturn = HTMLElement | undefined | null | void



export interface Block {
  ptr: ContextableNode
  ctx: Context
  blocks: Set<Block>
  teardown: () => void
}
