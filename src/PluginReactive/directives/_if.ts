import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import { evaluate } from '../expression.ts'
import { effect } from '../alien-signals'
import { nextWalkable, parentAndAnchor } from '../utils.ts'
import { pullAttr } from '../../common.ts'

type Branch = [
  el: HTMLElement,
  expr?: string | null
]

export const _if = (ctxRoot: Context, dir: DirectiveDef, el: HTMLElement) => {
  const {expr} = dir

  const [parent, anchor] = parentAndAnchor(dir, el)
  if (!parent) {
    console.log('warn u-if no parent')
    return
  }

  const branches: Branch[] = [[el, expr]]

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
      branches.push([elseEl, elseExp ])
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
      ctx.teardown()
      ctx = undefined
    }
  }

  const dispose = effect(() => {
    for (let i = 0; i < branches.length; i++) {
      const [el, expr] = branches[i]
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
