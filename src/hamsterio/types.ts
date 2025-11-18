
export type ContextableElement = Element | ShadowRoot

export interface Context {
  el: ContextableElement
  data: Record<string, any>
  cleanup: (() => void)[]
  signals?: SignalRecord
}

export type SignalGetter = () => any
export type SignalSetter = (newValue: any) => void
export type SignalPair = [SignalGetter, SignalSetter]

export type ProxyRecord = Record<string, any>
export type SignalRecord = Record<string, SignalPair>
export type ProxyStore = [ProxyRecord, SignalRecord]

export type Refs = Record<string, Ref>

export type Ref = {
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
