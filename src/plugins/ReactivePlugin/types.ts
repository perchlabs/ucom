import type { signal} from './alien-signals'

export type Signal = typeof signal
export type SignalRecord = Record<string, Signal>

export interface ValueWrapper<T = any> {
  v: T
}

export type persister = (v: string) => ValueWrapper
export type syncer = (v: string) => ValueWrapper
export type ComputedFunctionMaker = ($data: SignalRecord) => ComputedFunction
export type ComputedFunction = () => any
export type computer = (v: ComputedFunctionMaker) => ValueWrapper<ComputedFunctionMaker>

export type ProxyItemFunc = (...args: any[]) => any
export type ProxyRef = [
  key: string,
  item: Signal | (() => ComputedFunction),
  isFunc?: boolean,
]

export type ProxyRefRecord = Record<string, ProxyRef>

export type ProxyRecord = Record<string, Signal>

export type ProxyStoreAdd = (key: string, val: any) => void

export interface ProxyStore {
  signals: SignalRecord
  data: ProxyRecord
  add: ProxyStoreAdd
  computed: ProxyStoreAdd
  sync: ProxyStoreAdd
  persist: ProxyStoreAdd
}

export type ContextableElement = ShadowRoot | Element

export type RefRecord = Record<string, WeakRef<ContextableElement>>

export interface Context {
  el: ContextableElement
  data: Record<string, any>
  cleanup: (() => void)[]
  refs: RefRecord
  signals?: SignalRecord
}

export type DirectiveDef = {
  key: string
  modifier: string
  value: string
}
