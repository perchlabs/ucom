import type { Context } from './types.ts'

export function evaluate(ctx: Context, expr: string) {
  try {
    // Create a function that evaluates the expression
    // The 'with' statement allows: "count" instead of "$data.count"
    const fn = new Function('$data', '$el',
      `with($data) { return ${expr}; }`)
    
    // Execute and return result
    return fn(ctx.data, ctx.el)
  } catch (e) {
    console.error('[evaluate] Error: ', expr, e)
    return null
  }
}

export function execute(ctx: Context, code: string, event: Event | null = null) {
  try {
    // Create an async function to support await
    // Include $event for u-on compatibility
    const fn = new Function('$event', '$el', '$data',
      `return (async () => {
        with($data) {
          ${code}
        }
      })();`)
    
    // Execute and return promise for error handling
    return fn.call(ctx.data, event, ctx.el, ctx.data)
  } catch (err) {
    console.error('[execute] Error: ', err)
    return Promise.reject(err)
  }
}
