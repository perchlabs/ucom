import type {
  Context,
  DataRecord,
  DirectiveHandler,
  WalkableReturn,
} from '../reference.ts'
import {
  signal,
  trigger,
} from '../alien-signals/index.ts'
import { nextWalkable, parentAndAnchor } from '../utils.ts'
import {
  pullAttr,
  isValidCamel,
  isPromise,
  isPromisePending,
  AbortablePromise,
  ObjectEntries,
  ObjectEntriesEach,
} from '../../common.ts'

const AWAIT = '#await'
const THEN = '#then'
const CATCH = '#catch'

type BlockSpec = [
  el: HTMLElement,
  exp: string,
  useData?: true,
]
type BlockKey = keyof BlockSpecs
interface BlockSpecs {
  [AWAIT]: BlockSpec
  [THEN]?: BlockSpec
  [CATCH]?: BlockSpec
}

type Block = [
  el: HTMLElement,
  data: DataRecord,
]

export const _await: DirectiveHandler = (
  ctxRoot,
  elRoot,
  {exp: expRoot},
) => {
  if (!expRoot) {
    return
  }
  let ctx: Context | undefined
  let ptr: WalkableReturn = elRoot

  const blkSpecs: BlockSpecs = {
    [AWAIT]: [elRoot as HTMLElement, expRoot]
  }

  const want = (key: BlockKey) => take(key, false)
  const take = (key: BlockKey, mustWalk = true): BlockSpec | undefined => {
    if (ptr) {
      let tpl: BlockSpec | undefined
      const exp = pullAttr(ptr, key)
      if (exp !== null) {
        if (exp && !isValidCamel(exp)) {
          throw `${key} invalid name '${exp}'`
        }

        tpl = blkSpecs[key] = [ptr as HTMLElement, exp, true]
      }
      if (tpl || mustWalk) {
        ptr = nextWalkable(ptr)
      }
      return tpl
    }
  }

  try {
    if (want(THEN)) {
      take(CATCH)
    } else if (!take(CATCH)) {
      want(THEN)
      take(CATCH)
    }
  } catch (e) {
    console.error(e)
    return ptr
  }

  const [parent, anchor] = parentAndAnchor(elRoot)
  Object.values(blkSpecs).forEach(([el]) => el.remove())
  if (!parent) {
    return ptr
  }

  const isAwaitSeparate = elRoot !== blkSpecs[THEN]?.[0] && elRoot !== blkSpecs[CATCH]?.[0]
  const $blocks = signal<Block[]>([])
  let controller: AbortController

  const tryBlock = (key: BlockKey, value?: any): void => {
    if (blkSpecs[key]) {
      const [ptr, exp, useData] = blkSpecs[key]
      $blocks().push([
        ptr,
        useData && exp ? {[exp]: value} : {},
      ])
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
      let rawPromise: any = ctxRoot.eval(expRoot)
      if (!isPromise(rawPromise)) {
        rawPromise = Promise.resolve(rawPromise)
      }

      if (isAwaitSeparate && await isPromisePending(rawPromise)) {
        tryBlock(AWAIT)
      }

      controller = new AbortController
      try {
        const value = await AbortablePromise(rawPromise, controller)
        tryBlock(THEN, value)
      } catch (err) {
        if (err !== AbortablePromise.Canceled) {
          tryBlock(CATCH, err)
        }
      }
    } catch (err) {
      console.error(err)
    }
  },
  cleanup)

  ctxRoot.effect(() => {
    const block = $blocks().at(-1)
    
    if (block) {
      $blocks([])
      cleanup()
  
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
