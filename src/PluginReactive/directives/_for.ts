import type {
  Context,
  DirectiveDef,
  DataRecord,
} from '../types.ts'
import { isNumber, isObject, isArray } from '../../common.ts'
import { evaluate } from '../expression.ts'
import { parentAndAnchor, getParent, nextWalkable } from '../utils.ts'

const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
const stripParensRE = /^\(|\)$/g
const destructureRE = /^[{[]\s*((?:[\w_$]+\s*,?\s*)+)[\]}]$/

export function _for(ctxRoot: Context, dir: DirectiveDef, el: Element) {
  const {expr} = dir

  const next = nextWalkable(el)

  const inMatch = expr.match(forAliasRE)
  if (!inMatch) {
    console.warn(`[#each] expression: ${expr}`)
    return next
  }

  const sourceExp = inMatch[2].trim()
  let valueExp = inMatch[1].trim().replace(stripParensRE, '').trim()
  let destructureBindings: string[] | undefined
  let isArrayDestructure = false
  let indexExp = 'index'
  // let objIndexExp: string | undefined

  // let keyExp = pullAttr(el, ':key')

  let match
  if ((match = valueExp.match(forIteratorRE))) {
    valueExp = valueExp.replace(forIteratorRE, '').trim()
    indexExp = match[1].trim()
    // if (match[2]) {
    //   objIndexExp = match[2].trim()
    // }
  }

  if ((match = valueExp.match(destructureRE))) {
    destructureBindings = match[1].split(',').map((s) => s.trim())
    isArrayDestructure = valueExp[0] === '['
  }

  let [parent, anchor] = parentAndAnchor(dir, el, expr)
  el.remove()


  const createChildContexts = (
    source: unknown,
  ): Context[] => {
    const dataArr: DataRecord[] = []

    if (isArray(source)) {
      for (let i = 0; i < source.length; i++) {
        dataArr.push(createChildData(source[i], i))
      }
    } else if (isNumber(source)) {
      for (let i = 0; i < source; i++) {
        dataArr.push(createChildData(i, i))
      }
    } else if (isObject(source)) {
      let i = 0
      for (const k in source) {
        dataArr.push(createChildData(source[k], i++, k))
      }
    }

    const ctxs: Context[] = dataArr.map((data) => {
      // const key = keyExp ? evaluate(keyExp, data) : index

      const ctx: Context = ctxRoot.scope(el, data)

      return ctx
    })

    return ctxs
  }



  const createChildData = (
    value: any,
    index: number,
    objKey?: string
  ) => {
    const data: DataRecord = {}
    if (destructureBindings) {
      destructureBindings.forEach(
        (b, i) => (data[b] = value[isArrayDestructure ? i : b])
      )
    } else {
      data[valueExp] = value
    }

    if (indexExp) {
      data[indexExp] = objKey ?? index
    }
    // if (objIndexExp) {
    //   data[objIndexExp] = index
    // }

    return data
  }


  // Keep track of rendered contexts for cleanup
  let ctxs: Context[]
  const cleanSaved = () => {
    // Clean up previous render
    ctxs?.forEach(ctx => ctx.teardown())
    ctxs = []
  }

  // Create effect that re-renders whenever array changes
  ctxRoot.effect(() => {
    try {
      cleanSaved()
      parent = getParent(anchor)!
      // Evaluate the array expression
      let source = evaluate(sourceExp, ctxRoot)

      ctxs = createChildContexts(source)

      ctxs.forEach(ctx => ctx.mount(parent!, anchor))
    } catch (e) {
      console.error('[#each] ', e)
    }
  })

  return next
}

