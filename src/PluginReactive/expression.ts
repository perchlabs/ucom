import type {
  DataRecord,
  Context,
} from './types.ts'
import { ObjectKeys, ObjectValues } from '../common.ts'

export function evaluate(expr: string, ctxThis: Context | null, other: DataRecord = {}) {
  return run(
    `with($data) { return ${expr}; }`,
    ctxThis?.data ?? {},
    other,
  )
}

export function execute(expr: string, ctxThis: Context | null, other: DataRecord = {}) {
  run(
    `with($data) { ${expr}; }`,
    ctxThis?.data ?? {},
    other,
  )
}

function run(code: string, $data: DataRecord, other: DataRecord) {
  const params: DataRecord = {...other, $data}

  try {
    const fn = new Function(...ObjectKeys(params), code)
    return fn(...ObjectValues(params))
  } catch (err) {
    console.error('[execute] ', code, err)
  }
}
