import type {
  DataRecord,
  Context,
} from './reference.ts'
import { ObjectKeys, ObjectValues } from '../common.ts'

export const evaluate = (
  exp: string,
  ctxThis: Context | null,
  other: DataRecord = {},
) =>
  run(
    `with($data) { return ${exp}; }`,
    ctxThis?.data ?? {},
    other,
  )

export const execute = (
  exp: string,
  ctxThis: Context | null,
  other: DataRecord = {},
): void => 
  run(
    `with($data) { ${exp}; }`,
    ctxThis?.data ?? {},
    other,
  ) as void

const run = (code: string, $data: DataRecord, other: DataRecord): unknown => {
  const params: DataRecord = {...other, $data}
  try {
    const fn = new Function(...ObjectKeys(params), code)
    return fn(...ObjectValues(params))
  } catch (err) {
    console.error('[execute] ', code, err)
  }
}
