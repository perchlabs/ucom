import type { ComponentManager } from '../types.ts'
import type { signal} from './alien-signals'

export type Signal = ReturnType<typeof signal>
export type ProxyRecord = Record<string, any>
export type ComputedFunction = () => any

export interface Store {
  data: ProxyRecord
  varRaw: (raw: Record<string, any>) => void
  copy: (dataNew?: ProxyRecord) => Store

  var: StoreAdder
  calc: StoreAdder
  sync: StoreAdder
  save: StoreAdder
}
export type StoreAdder = (key: string, val: any) => void



export interface Context {
  man: ComponentManager
  store: Store
  refs: RefRecord
  cleanup: (() => void)[]

  key?: any
  dup?: DocumentFragment | HTMLElement
  ptr: ContextableNode
  start: Node

  teardownCallback?(): void
  mount(parent: ContextableNode, anchor: Node): Context
  insert(parent: ContextableNode, anchor: Node): void
  scope(el: HTMLElement, store?: Store): Context
  walk(): void
  remove(): void
  teardown(): void
}
// export type ContextableNode = ShadowRoot | Element
export type ContextableNode = ShadowRoot | HTMLElement
export type RefRecord = Record<string, WeakRef<ContextableNode>>

export type DirectiveDef = {
  full: string
  key: string
  expr: string
  ref?: string
  mod?: string
}
export type DirectiveHandler = (ctx: Context, el: HTMLElement, dir: DirectiveDef)
  => DirectiveHandlerReturn
export type DirectiveHandlerReturn = HTMLElement | undefined | null | void



export interface Block {
  ptr: ContextableNode
  ctx: Context
  blocks: Set<Block>
  teardown: () => void
}
