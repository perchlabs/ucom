import type {
  // Context,
  ProxyRecord,
} from './types.ts'

export function evaluate(expr: string, dataThis: ProxyRecord = {}, other: ProxyRecord = {}) {
  const params: ProxyRecord = {
    $data: dataThis,
    ...other,
  }

  try {
    // Create a function that evaluates the expression
    // The 'with' statement allows: "count" instead of "$data.count"
    const fn = new Function(
      ...Object.keys(params),
      `with($data) { return ${expr}; }`
    )

    // Execute and return result
    return fn(...Object.values(params))
  } catch (e) {
    console.error('[evaluate] Error: ', expr, e)
    return null
  }
}

export function execute(code: string, dataThis: ProxyRecord = {}, other: ProxyRecord = {}) {
  const params: ProxyRecord = {
    $data: dataThis,
    ...other,
  }

  try {
    // Create an async function to support await
    const fn = new Function(
      ...Object.keys(params),
      `return (async () => {
        with($data) { ${code} }
      })();`,
    )

    // Execute and return promise for error handling
    return fn.call(dataThis, ...Object.values(params)) as Promise<void>
  } catch (err) {
    console.error('[execute] Error: ', err)
    return Promise.reject(err)
  }
}
