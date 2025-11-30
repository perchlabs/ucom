
export type ContextableElement = Element | ShadowRoot

export interface Context {
  el: ContextableElement
  data: Record<string, any>
  cleanup: (() => void)[]
  refs: RefRecord
  signals?: SignalRecord
}

export type RefRecord = Record<string, WeakRef<ContextableElement>>

export type SignalGetter = () => any
export type SignalSetter = (newValue: any) => void
export type SignalPair = [SignalGetter, SignalSetter]

export type ProxyRecord = Record<string, any>
export type SignalRecord = Record<string, SignalPair>
export type ProxyStore = [ProxyRecord, SignalRecord]

export type ProxyRefRecord = Record<string, ProxyRef>

export type ProxyRef = {
  key: string
  func?: (...args: any[]) => any
  pair?: SignalPair
}
export type RefFunc = {
  key: string
  func: (...args: any[]) => any
}
export type RefSignal = {
  key: string
  pair: SignalPair
}

export type DirectiveDef = {
  key: string
  modifier: string
  value: string
}
