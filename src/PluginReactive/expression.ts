import type {
  DataRecord,
} from './reference.ts'
import { ObjectKeys, ObjectValues } from '../common.ts'

// This can determine if an expression is a normal property accessor.
export const simplePathRE =
  /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/

export const evaluate = (exp: string, $data: DataRecord, other: DataRecord): unknown => {
  const params: DataRecord = {...other, $data}
  try {
    const fn = new Function(...ObjectKeys(params), `with($data) { return ${exp}; }`)
    return fn(...ObjectValues(params))
  } catch (err) {
    console.error('[run] ', exp, err)
  }
}
