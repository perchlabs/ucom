import type { ComponentManager } from '../types.ts'
import type { signal} from './alien-signals'

export type Signal = ReturnType<typeof signal>
export type ProxyRecord = Record<string, any>
export type ComputedFunction = () => any

export interface Store {
  data: ProxyRecord
  addRaw: (raw: Record<string, any>) => void
  copy: (dataNew?: ProxyRecord) => Store

  add: StoreAdder
  computed: StoreAdder
  sync: StoreAdder
  persist: StoreAdder
}
export type StoreAdder = (key: string, val: any) => void

export interface Context {
  man: ComponentManager
  store: Store,
  refs: RefRecord
  cleanup: (() => void)[]
}
export type ContextableNode = ShadowRoot | Element
export type RefRecord = Record<string, WeakRef<ContextableNode>>

export type DirectiveDef = {
  full: string
  key: string
  ref?: string
  mod?: string
  val: string
}
export type DirectiveHandler = (ctx: Context, el: HTMLElement, dir: DirectiveDef)
  => DirectiveHandlerReturn
export type DirectiveHandlerReturn = ChildNode | undefined | null | void
