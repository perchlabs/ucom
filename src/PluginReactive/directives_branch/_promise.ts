import type {
  Context,
  DataRecord,
  BranchDirectiveHandler,
  WalkableReturn,
} from '../reference.ts'
import type {
  DirectiveDef,
} from '../../reference.ts'
import {
  STORE_DEFAULT_INDEX,
} from '../reference.ts'
import {
  signal,
  trigger,
} from '../alien-signals/index.ts'
import { nextWalkable, parentAndAnchor } from '../utils.ts'
import {
  isString,
  isSimplePath,
  isPromisePending,
  AbortablePromise,
  ObjectValues,
  PromiseResolve,
} from '../../common.ts'
import {
  getDirectives,
  createDirectiveDefinition,
} from '../../directive.ts'

export const OP_AWAIT = '#await'
const OP_THEN = '#then'
const OP_CATCH = '#catch'

export const OP_GET = '#get'
export const OP_QUERY = '#query'
export const OP_POST = '#post'
export const OP_PUT = '#put'
export const OP_PATCH = '#patch'
export const OP_DELETE = '#delete'
type FetchOp = typeof OP_GET | typeof OP_QUERY | typeof OP_POST | typeof OP_PUT | typeof OP_PATCH | typeof OP_DELETE

const FETCH_GET = 'get'
const FETCH_QUERY = 'query'
const FETCH_POST = 'post'
const FETCH_PUT = 'put'
const FETCH_PATCH = 'patch'
const FETCH_DELETE = 'delete'
type FetchType = typeof FETCH_GET | typeof FETCH_QUERY |typeof FETCH_POST | typeof FETCH_PUT | typeof FETCH_PATCH | typeof FETCH_DELETE

const fetchMap: Record<FetchOp, FetchType> = {
  [OP_QUERY]: FETCH_QUERY,
  [OP_GET]: FETCH_GET,
  [OP_POST]: FETCH_POST,
  [OP_PUT]: FETCH_PUT,
  [OP_PATCH]: FETCH_PATCH,
  [OP_DELETE]: FETCH_DELETE,
}

const PROMISE = 'promise'
const THEN = 'then'
const CATCH = 'catch'

type BlockSpec = [
  el: Element,
  dir: DirectiveDef,
]
type BlockKey = typeof PROMISE | typeof THEN | typeof CATCH
interface BlockSpecs {
  [PROMISE]: BlockSpec
  [THEN]?: BlockSpec
  [CATCH]?: BlockSpec
}

type Block = [
  el: Element,
  data: DataRecord,
]

type Filters = {
  [k in BlockKey]: RegExp
}

const makeDirectiveFilter = (opArr: string[]) =>
  new RegExp('^' + ObjectValues(opArr).map(RegExp.escape).join('|'))
const filters: Filters = {
  [PROMISE]: makeDirectiveFilter([OP_AWAIT, OP_GET, OP_POST, OP_PUT, OP_PATCH]),
  [THEN]: makeDirectiveFilter([OP_THEN]),
  [CATCH]: makeDirectiveFilter([OP_CATCH]),
}
const isValidFetchType = (key: string): key is keyof typeof fetchMap =>
  key in fetchMap

const removeDirectives = (el: Element, key: BlockKey) =>
  getDirectives(el, filters[key]).forEach(({full}) => el.removeAttribute(full))

export const _promise: BranchDirectiveHandler = (
  ctxRoot,
  elRoot,
  dirRoot,
) => {
  const {
    op,
    exp: expRoot,
  } = dirRoot

  if (!expRoot) {
    return
  }
  let ctx: Context | undefined
  let ptr: WalkableReturn = elRoot

  const method = isValidFetchType(op) ? fetchMap[op] : null

  removeDirectives(elRoot, PROMISE)
  const blkSpecs: BlockSpecs = {
    [PROMISE]: [elRoot, dirRoot]
  }

  const scan = (key: BlockKey, forceWalk: boolean) => {
    if (ptr) {

      if (getDirectives(ptr, filters[PROMISE]).length) {
        throw ''
      }

      let tpl: BlockSpec | undefined
      const [dir] = getDirectives(ptr, filters[key])
      if (dir) {
        // if (exp && !isValidCamel(exp)) {
        //   throw `${key} invalid name '${exp}'`
        // }

        tpl = blkSpecs[key] = [ptr, dir]
      }
      if (tpl || forceWalk) {
        ptr = nextWalkable(ptr)
      }
      return tpl
    }
  }
  const soft = (key: BlockKey) => scan(key, false)
  const hard = (key: BlockKey) => scan(key, true)

  try {
    if (soft(THEN)) {
      soft(CATCH)
    } else if (!hard(CATCH)) {
      soft(THEN)
      soft(CATCH)
    }
  } catch (e) {}

  const [parent, anchor] = parentAndAnchor(elRoot)
  ObjectValues(blkSpecs).forEach(([el]) => el.remove())

  if (!parent) {
    return ptr
  }

  const isAwaitOp = op === OP_AWAIT
  const hasResultBlock = !!(blkSpecs[THEN] || blkSpecs[CATCH])
  if (!isAwaitOp && !hasResultBlock) {
    // FIXME: Remove the '!' that is eating the undefined below
    blkSpecs[THEN] = [elRoot, createDirectiveDefinition('#then', '')!]
    elRoot.setAttribute('!!', '')
  }
  const hasSeparatePromiseBlock = elRoot !== blkSpecs[THEN]?.[0] && elRoot !== blkSpecs[CATCH]?.[0]

  const $blocks = signal<(Block | null)[]>([])
  let controller: AbortController

  const runBlock = (blkkey: BlockKey, value?: any) => {
    if (blkSpecs[blkkey]) {
      const [el, {exp}] = blkSpecs[blkkey]
      const data: DataRecord = {}
      if (blkkey !== PROMISE) {
        const key = exp ? exp : STORE_DEFAULT_INDEX
        data[key] = value
      }
      $blocks().push([el, data])
      trigger($blocks)
    }
  }

  const cleanup = () => {
    controller?.abort()
    if (ctx) {
      ctx.teardown()
      ctx = undefined
    }
  }

  ctxRoot.effect(async () => {
    try {
      let promise: Promise<unknown>
      if (method) {
        const url = isSimplePath(expRoot) ? expRoot : ctxRoot.eval(expRoot)
        if (!isString(url)) {
          throw `Fetch ${method} URL is not a string`
        }

        promise = fetch(url, {method})
      } else {
        promise = PromiseResolve(ctxRoot.eval(expRoot))
      }

      if (hasSeparatePromiseBlock && await isPromisePending(promise)) {
        runBlock(PROMISE)
      }

      controller = new AbortController
      try {
        runBlock(THEN, await AbortablePromise(promise, controller))
      } catch (err) {
        if (err !== AbortablePromise.Canceled) {
          runBlock(CATCH, err)
        }
      }
    } catch (err) {
      console.error(err)
    }
  },
  cleanup)

  ctxRoot.effect(() => {
    const block = $blocks().at(-1)

    if (block !== undefined) {
      $blocks([])
      cleanup()
    }

    if (block) {
      try {
        const [el, data] = block
        ctx = ctxRoot
          .scope(el, data)
          .mount(parent, anchor)
      } catch (err) {
        console.error(err)
      }
    }
  },
  cleanup)

  return ptr
}
