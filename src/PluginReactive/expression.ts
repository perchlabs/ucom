import type {
  DataRecord,
  Context,
} from './types.ts'
import { ObjectKeys, ObjectValues } from '../common.ts'

export function evaluate(expr: string, ctxThis?: Context | DataRecord | null, other: DataRecord = {}) {
  const params: DataRecord = {
    $data: ctxThis?.data ?? {},
    ...other,
  }

  try {
    // Create a function that evaluates the expression
    // The 'with' statement allows: "count" instead of "$data.count"
    const fn = new Function(
      ...ObjectKeys(params),
      `with($data) { return ${expr}; }`
    )

    // Execute and return result
    return fn(...ObjectValues(params))
  } catch (e) {
    console.error('[evaluate] ', expr, e)
    return null
  }
}

export function execute(code: string, ctxThis?: Context | DataRecord | null, other: DataRecord = {}) {
  const $data = ctxThis?.data ?? {}
  const params: DataRecord = {
    $data,
    ...other,
  }

  try {
    // Create an async function to support await
    const fn = new Function(
      ...ObjectKeys(params),
      `return (async () => {
        with($data) { ${code} }
      })();`,
    )

    // Execute and return promise for error handling
    return fn.call($data, ...ObjectValues(params)) as Promise<void>
  } catch (err) {
    console.error('[execute] ', err)
    return Promise.reject(err)
  }
}
