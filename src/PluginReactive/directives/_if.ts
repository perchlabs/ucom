import type { Context, DirectiveDef } from '../types.ts'
import { evaluate } from '../expression.ts'
import { effect } from '../alien-signals'
import { getParent, nextWalkable } from '../utils.ts'
import { pullAttr } from '../../common.ts'

interface Branch {
  el: HTMLElement
  expr?: string | null
}

export const _if = (ctxRoot: Context, el: HTMLElement, dir: DirectiveDef) => {
  const {expr} = dir

  const parent = getParent(el)

  const anchor = new Comment('v-if')
  parent.insertBefore(anchor, el)

  const branches: Branch[] = [{el, expr}]

  // locate else branch
  let elseEl: HTMLElement | null
  let elseExp: string | null
  while ((elseEl = nextWalkable(el))) {
    elseExp = null
    if (
      pullAttr(elseEl, 'u-else') === '' ||
      (elseExp = pullAttr(elseEl, 'u-else-if'))
    ) {
      parent.removeChild(elseEl)
      branches.push({ el: elseEl, expr: elseExp })
    } else {
      break
    }
  }

  const next = nextWalkable(el)
  parent.removeChild(el)

  let ctx: Context | undefined
  let activeBranchIndex: number = -1

  const removeActiveContext = () => {
    if (ctx) {
      parent.insertBefore(anchor, ctx.start)
      ctx.remove()
      ctx = undefined
    }
  }

  const dispose = effect(() => {
    for (let i = 0; i < branches.length; i++) {
      const { el, expr } = branches[i]
      if (!expr || evaluate(expr, ctxRoot)) {
        if (i !== activeBranchIndex) {
          removeActiveContext()
          ctx = ctxRoot.scope(el)
          ctx.mount(parent, anchor)

          parent.removeChild(anchor)
          activeBranchIndex = i
        }
        return
      }
    }
    // no matched branch.
    activeBranchIndex = -1
    removeActiveContext()
  })

  ctxRoot.cleanup.push(dispose)

  return next
}
