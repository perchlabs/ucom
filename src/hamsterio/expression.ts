import type { Context } from './types.ts'

export function evaluateExpression(expr: string, context: Context) {
  try {
    // Create a function that evaluates the expression
    // The 'with' statement allows: "count" instead of "$data.count"
    const fn = new Function('$data', '$el',
      `with($data) { return ${expr}; }`)
    
    // Execute and return result
    return fn(context.data, context.el)
  } catch (e) {
    console.error('🐹 [evaluateExpression] Error: ', expr, e)
    return null
  }
}

export function executeStatement(code: string, context: Context, event: Event | null = null) {
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
    return fn.call(context.data, event, context.el, context.data)
  } catch (err) {
    console.error('🐹 [executeStatement] Error: ', err)
    return Promise.reject(err)
  }
}
