import type {
  ProxyRecord,
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  isNumber,
  isObject,
  isArray,
  pullAttr,
} from '../../common.ts'
import { evaluate } from '../expression.ts'
import { nextWalkable, getParent, parentAndAnchor } from '../utils.ts'

const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
const stripParensRE = /^\(|\)$/g
const destructureRE = /^[{[]\s*((?:[\w_$]+\s*,?\s*)+)[\]}]$/

type KeyToIndexMap = Map<any, number>
type ContextToIndexMap = WeakMap<Context, number>

export const _for = (ctxRoot: Context, dir: DirectiveDef, el: HTMLElement) => {
  const {expr} = dir

  const inMatch = expr.match(forAliasRE)
  if (!inMatch) {
    console.warn(`[#each] invalid expression: ${expr}`)
    return
  }

  let [parent, anchor] = parentAndAnchor(dir, el, expr)
  if (!parent) {
    console.warn('[#each] no parent')
    return
  }

  const next = nextWalkable(el)

  parent.removeChild(el)

  const sourceExp = inMatch[2].trim()
  let valueExp = inMatch[1].trim().replace(stripParensRE, '').trim()
  let destructureBindings: string[] | undefined
  let isArrayDestructure = false
  let indexExp: string | undefined
  let objIndexExp: string | undefined

  let keyExp = pullAttr(el, ':key')
  // if (keyExp) {
  //   keyExp = JSON.stringify(keyExp)
  // }

  let match: RegExpMatchArray | null
  if ((match = valueExp.match(forIteratorRE))) {
    valueExp = valueExp.replace(forIteratorRE, '').trim()
    indexExp = match[1].trim()
    if (match[2]) {
      objIndexExp = match[2].trim()
    }
  }

  if ((match = valueExp.match(destructureRE))) {
    destructureBindings = match[1].split(',').map((s) => s.trim())
    isArrayDestructure = valueExp[0] === '['
  }

  const createChildContexts = (
    source: unknown,
    prevCtxs: Context[],
    prevKeyToIndexMap: KeyToIndexMap, 
  ): [Context[], KeyToIndexMap, ContextToIndexMap] => {
    const keyToIndexMap: KeyToIndexMap = new Map
    const ctxToIndexMap: ContextToIndexMap = new WeakMap
    const dataArr: ProxyRecord[] = []

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

// dataArr.forEach(data => console.log('createChildContexts data index: ', {...data}))

    const ctxs: Context[] = dataArr.map((data, index) => {
      const key = keyExp ? evaluate(keyExp, data) : index
      const oldIndex = prevKeyToIndexMap?.get(key)

      let ctx: Context
      if (oldIndex !== undefined) {
        ctx = prevCtxs[oldIndex]
        // const store = ctx.store
        for (const k in ctx.data) {
          ctx.data[k] = data[k]
// console.log('updating data: ', k)
          // if (k in store.data) {
          //   store.data[k] = data[k]
          // } else {
          //   store.var(k, data[k])
          // }
        }
      } else {
        ctx = ctxRoot.scope(el, data)
      }

      keyToIndexMap.set(key, index)
      ctxToIndexMap.set(ctx, index)

      return ctx
    })

// ctxs.forEach(ctx => console.log('createChildContexts ctx index: ',  {...ctx.store.data}))

    return [ctxs, keyToIndexMap, ctxToIndexMap]
  }

  const createChildData = (
    value: any,
    index: number,
    objKey?: string
  ) => {
    const data: ProxyRecord = {}
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
    if (objIndexExp) {
      data[objIndexExp] = index
    }

    return data
  }

  let mounted = false
  let ctxs: Context[]
  let keyToIndexMap: KeyToIndexMap
  let ctxToIndexMap: ContextToIndexMap

  ctxRoot.effect(() => {
// console.log('sourceExp :', sourceExp)
    const source = evaluate(sourceExp, ctxRoot)

    const prevCtxToIndexMap = ctxToIndexMap
    const prevKeyToIndexMap = keyToIndexMap
    const prevCtxs = ctxs

    ;[ctxs, keyToIndexMap, ctxToIndexMap] = createChildContexts(
      source,
      prevCtxs,
      prevKeyToIndexMap,
    )

// console.log('mounted: ', mounted, ctxs.length)
// ctxs.forEach(ctx => console.log(`ctx ${sourceExp}:`, {...ctx.data}))

    if (!mounted) {

      ctxs.forEach(ctx => ctx.mount(parent!, anchor))
      mounted = true
    } else {
      // Update parent in case of document fragment.
      parent = getParent(anchor)!
  if (!parent) {
    console.log('warn #each no parent')
    return
  }

      for (const ctx of prevCtxs) {
        if (!ctxToIndexMap.has(ctx)) {
          ctx.teardown()
        }
      }

      const nextCxts: Context[] = []
      let i = ctxs.length
      let nextCtx: Context | undefined
      let prevMovedCtx: Context | undefined

      while (i--) {
console.log(`loop: ${sourceExp}`)

        const childCtx = ctxs[i]
        const oldIndex = prevCtxToIndexMap.get(childCtx)

        let ctx: Context
        if (oldIndex == null) {
          // new
          console.log('ctx new index: ', {...childCtx.data})

          childCtx.mount(parent, nextCtx?.start ?? anchor)
          // childCtx.mount(parent, anchor)
          ctx = childCtx
        } else {
console.log('update store: ')

          // update
          ctx = ctxs[oldIndex]
          // ctx.store = childCtx.store.copy(ctx.store.data)
          // ctx.store = copyStore(childCtx.store, ctx.store.data)


          // ctx.store = childCtx.store
          // ctx.store.assign(childCtx.store)

          if (oldIndex !== i) {
            // moved
            if (
              ctxs[oldIndex + 1] !== nextCtx ||
              // If the next has moved, it must move too
              prevMovedCtx === nextCtx
            ) {
              prevMovedCtx = ctx
              ctx.mount(parent, nextCtx?.start ?? anchor)
              // ctx.mount(parent, anchor)
            }
          }
        }

        nextCtx = ctx
        nextCxts.unshift(nextCtx)
      }
      ctxs = nextCxts
    }
  })

  return next
}
