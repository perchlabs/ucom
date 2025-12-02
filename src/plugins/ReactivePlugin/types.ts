
export type SignalGetter = () => any
export type SignalSetter = (newValue: any) => void
// export type SignalPair = [SignalGetter, SignalSetter]
export type Signal = {
  (): number;
  (value: number): void;
}
// export type SignalRecord = Record<string, SignalPair>
export type SignalRecord = Record<string, Signal>

export type ContextableElement = ShadowRoot | Element
export type RefRecord = Record<string, WeakRef<ContextableElement>>
export interface Context {
  el: ContextableElement
  data: Record<string, any>
  cleanup: (() => void)[]
  refs: RefRecord
  signals?: SignalRecord
}

export type ProxyRecord = Record<string, any>
export type ProxyStore = [ProxyRecord, SignalRecord]

export type ProxyRef = {
  key: string
  func?: (...args: any[]) => any
  item?: Signal
  // pair?: SignalPair
}
export type ProxyRefRecord = Record<string, ProxyRef>

export type DirectiveDef = {
  key: string
  modifier: string
  value: string
}

// export type Callback = () => void
// export type EffectFunc = {
//   (): void
//   cleanup?: Set<Callback>
// }
