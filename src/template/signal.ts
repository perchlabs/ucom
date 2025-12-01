import type {
  ContextableElement,
  SignalPair,
  SignalRecord,
  ProxyRef,
  ProxyRefRecord,
  ProxyRecord,
  ProxyStore,
  Callback,
  EffectFunc,
} from './types.ts'

const effectStack: EffectFunc[] = []
let currentEffect: EffectFunc

const p = Promise.resolve()
export const nextTick = () => p.then()

export function makeProxyRef(key: string, value: any): ProxyRef {
  const ref: ProxyRef = {key}
  if (typeof value === 'function') {
    ref.func = value
  } else {
    ref.pair = createSignal(value)
  }
  return ref
}

export function createProxyRefs(data: Record<string, any>) {
  const refs: ProxyRefRecord = {}
  for (const [key, value] of Object.entries(data)) {
    refs[key] = makeProxyRef(key, value)
  }
  return refs
}

export function createProxyStore(el: ContextableElement, refs: ProxyRefRecord): ProxyStore {
  const proxy: ProxyRecord = {}
  const signals: SignalRecord = {}

  for (const {key, func, pair} of Object.values(refs)) {
    if (func) {
      proxy[key] = func.bind(el)
    } else if (pair) {
      signals[key] = pair

      const [get, set] = pair
      Object.defineProperty(proxy, key, {
        get() { return get() },
        set(val) { set(val) },
        enumerable: true
      })
    }
  }

  return [proxy, signals]
}

export function createSignal(initialValue: any): SignalPair {
  let value = initialValue
  const subscribers = new Set<Callback>

  const getter = () => {
    // If called within an effect, auto-subscribe
    if (currentEffect) {
      subscribers.add(currentEffect)
        
      // Register cleanup to remove this effect from subscribers
      if (currentEffect.cleanup) {
        currentEffect.cleanup.add(() => subscribers.delete(currentEffect))
      }
    }
    return value
  }

  const setter = (newValue: any) => {
    // Prevent unnecessary updates if value hasn't changed
    if (Object.is(value, newValue)) {
      return
    }
   
    value = newValue
    
    // Copy subscribers to prevent unwanted behaviour when resetting
    const subs = Array.from(subscribers)

    // Clear before running to prevent re-subscription during update
    subscribers.clear()

    // Run effects after updating value to prevent infinite loops
    subs.forEach(fn => {
      subscribers.add(fn) // Re-add after clearing
      fn()
    })
  }

  return [getter, setter]
}

/**
 * createEffect
 * ------------
 * Runs a reactive function immediately, and re-runs whenever
 * any signal used inside it changes.
 * 
 * The effect automatically tracks which signals it depends on by
 * monitoring signal reads during execution. When any dependency changes,
 * the effect re-runs.
 * 
 * Supports nested effects properly using an effect stack to preserve context.
 * 
 * Returns a dispose function to stop the effect and cleanup subscriptions.
 * 
 * Example:
 * ```js
 *   const [count, setCount] = createSignal(0)
 *   const dispose = createEffect(() => {
 *     console.log('Count is:', count())
 *   })
 *   setCount(1) // Effect re-runs, logs: "Count is: 1"
 *   dispose()   // Stop the effect, cleanup subscriptions
 * 
 * ```
 */
export function createEffect(fn: () => void) {
  let isDisposed = false
  const cleanup = new Set<Callback>

  const effect: EffectFunc = (() => {
    if (isDisposed) return

    // Save current effect and push to stack (handles nested effects)
    currentEffect = effect 
    effectStack.push(effect)
    
    try {
      fn()
    } finally {
      // Restore previous effect context
      effectStack.pop()
      currentEffect = effectStack[effectStack.length - 1] || null
    }
  })

  // Store cleanup functions so signals can add unsubscribe callbacks
  effect.cleanup = cleanup

  const dispose = () => {
    isDisposed = true

    // Run all cleanup functions (removes effect from all signal subscribers)
    cleanup.forEach(fn => fn())
    cleanup.clear()
  }

  // Run immediately to establish initial dependencies
  effect()

  // Return cleanup 
  return dispose
}
