import type { SignalPair } from './types.ts'

type Callback = () => any
type EffectFunc = {
  (): void
  cleanup?: Set<Callback>
}

let currentEffect: EffectFunc

const effectStack: EffectFunc[] = []

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

  const effect = (() => {
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
  }) as EffectFunc

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
