import type { signal} from './alien-signals'

export type Signal = typeof signal
export type SignalRecord = Record<string, Signal>
export type ProxyRecord = Record<string, Signal>

export interface ValueWrapper<T = any> {
  v: T
}

export type persister = (v: string) => ValueWrapper
export type syncer = (v: string) => ValueWrapper
export type ComputedFunctionMaker = ($data: SignalRecord) => ComputedFunction
export type ComputedFunction = () => any
export type computer = (v: ComputedFunctionMaker) => ValueWrapper<ComputedFunctionMaker>

export interface Store {
  signals: SignalRecord
  data: ProxyRecord
  add: StoreAdder
  computed: StoreAdder
  sync: StoreAdder
  persist: StoreAdder
}
export type StoreAdder = (key: string, val: any) => void

export type ContextableElement = ShadowRoot | Element

export type RefRecord = Record<string, WeakRef<ContextableElement>>

export interface Context {
  el: ContextableElement
  data: Record<string, any>
  refs: RefRecord
  cleanup: (() => void)[]
}

export type DirectiveDef = {
  key: string
  modifier: string
  value: string
}
