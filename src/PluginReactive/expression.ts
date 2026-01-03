import type { Context } from './types.ts'

export function evaluate({data}: Context, expr: string) {
  try {
    // Create a function that evaluates the expression
    // The 'with' statement allows: "count" instead of "$data.count"
    const fn = new Function('$data',
      `with($data) { return ${expr}; }`)
    
    // Execute and return result
    return fn(data)
  } catch (e) {
    console.error('[evaluate] Error: ', expr, e)
    return null
  }
}

export function execute({data}: Context, code: string, event: Event | null = null) {
  try {
    // Create an async function to support await
    // Include $event for u-on compatibility
    const fn = new Function('$event', '$data',
      `return (async () => {
        with($data) {
          ${code}
        }
      })();`)

    // Execute and return promise for error handling
    return fn.call(data, event, data) as Promise<void>
  } catch (err) {
    console.error('[execute] Error: ', err)
    return Promise.reject(err)
  }
}
