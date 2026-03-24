import type { Context, DirectiveDef } from '../types.ts'
import { evaluate } from '../expression.ts'
import { effect } from '../alien-signals'
import { getParent, nextWalkable } from '../utils.ts'
import { pullAttr, isNumber, isRecord } from '../../common.ts'

const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
const stripParensRE = /^\(|\)$/g
const destructureRE = /^[{[]\s*((?:[\w_$]+\s*,?\s*)+)[\]}]$/

type KeyToIndexMap = Map<any, number>

export const _for = (ctxRoot: Context, el: HTMLElement, dir: DirectiveDef) => {
  const {expr} = dir

  const inMatch = expr.match(forAliasRE)
  if (!inMatch) {
    console.warn(`invalid u-for expression: ${expr}`)
    return
  }

  const parent = getParent(el)
  const next = nextWalkable(el)

  const anchor = new Text('')
  parent.insertBefore(anchor, el)
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

  const createChildContexts = (source: unknown): [Context[], KeyToIndexMap] => {
    const map: KeyToIndexMap = new Map
    const ctxs: Context[] = []

    if (Array.isArray(source)) {
      for (let i = 0; i < source.length; i++) {
        ctxs.push(createChildContext(map, source[i], i))
      }
    } else if (isNumber(source)) {
      for (let i = 0; i < source; i++) {
        ctxs.push(createChildContext(map, i + 1, i))
      }
    } else if (isRecord(source)) {
      let i = 0
      for (const k in source) {
        ctxs.push(createChildContext(map, source[k], i++, k))
      }
    }

    return [ctxs, map]
  }

  const createChildContext = (
    map: KeyToIndexMap,
    value: any,
    index: number,
    objKey?: string
  ): Context => {
    const data: any = {}
    if (destructureBindings) {
      destructureBindings.forEach(
        (b, i) => (data[b] = value[isArrayDestructure ? i : b])
      )
    } else {
      data[valueExp] = value
    }
    if (objKey) {
      indexExp && (data[indexExp] = objKey)
      objIndexExp && (data[objIndexExp] = index)
    } else {
      indexExp && (data[indexExp] = index)
    }

    const ctx = ctxRoot.scope(el, data)
    const key = keyExp ? evaluate(keyExp, ctx) : index
    map.set(key, index)
    ctx.key = key

    return ctx
  }

  let mounted = false
  let ctxs: Context[]
  let keyToIndexMap: Map<any, number>

  const dispose = effect(() => {
    const source = evaluate(sourceExp, ctxRoot)
    const prevKeyToIndexMap = keyToIndexMap
    ;[ctxs, keyToIndexMap] = createChildContexts(source)
    if (!mounted) {
      ctxs.forEach(ctx => ctx.mount(parent, anchor))
      mounted = true
    } else {
      for (const ctx of ctxs) {
        if (!keyToIndexMap.has(ctx.key)) {
          ctx.remove()
        }
      }

      const nextCxts: Context[] = []
      let i = ctxs.length
      let nextCtx: Context | undefined
      let prevMovedCtx: Context | undefined

      while (i--) {
        const childCtx = ctxs[i]
        const oldIndex = prevKeyToIndexMap.get(childCtx.key)

        let ctx: Context
        if (oldIndex == null) {
          // new
          ctx = childCtx.mount(parent, nextCtx?.dup ?? anchor)
        } else {
          // update
          ctx = ctxs[oldIndex]
          ctx.store = childCtx.store.copy(ctx.store.data)

          if (oldIndex !== i) {
            // moved
            if (
              ctxs[oldIndex + 1] !== nextCtx ||
              // If the next has moved, it must move too
              prevMovedCtx === nextCtx
            ) {
              prevMovedCtx = ctx
              ctx.insert(parent, nextCtx?.dup ?? anchor)
            }
          }
        }

        nextCtx = ctx
        nextCxts.unshift()
      }
      ctxs = nextCxts
    }
  })

  ctxRoot.cleanup.push(dispose)

  return next
}
