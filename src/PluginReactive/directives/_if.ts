import type {
  Context,
  DirectiveHandler,
  WalkableReturn,
} from '../reference.ts'
import { evaluate } from '../expression.ts'
import { nextWalkable, parentAndAnchor } from '../utils.ts'
import { pullAttr } from '../../common.ts'

type Branch = [
  el: Element,
  exp: string | null
]

export const _if: DirectiveHandler = (
  ctxRoot,
  el,
  dir,
) => {
  const {exp} = dir

  const branches: Branch[] = [[el, exp]]

  // locate else branch
  let elseEl: WalkableReturn
  let elseExp: string | null
  while (elseEl = nextWalkable(el)) {
    elseExp = null
    if (
      pullAttr(elseEl, '#else') === '' ||
      (elseExp = pullAttr(elseEl, '#else-if'))
    ) {
      elseEl.remove()
      branches.push([elseEl, elseExp])
    } else {
      break
    }
  }

  const [parent, anchor] = parentAndAnchor(el, dir)
  if (!parent) {
    return
  }
  const next = nextWalkable(el)
  el.remove()

  let ctx: Context | undefined
  let activeBranchIndex: number = -1

  const removeActiveContext = () => {
    if (ctx) {
      parent.insertBefore(anchor, ctx.start)
      ctx.teardown()
      ctx = undefined
    }
  }

  ctxRoot.effect(() => {
    for (let i = 0; i < branches.length; i++) {
      const [el, exp] = branches[i]
      if (!exp || evaluate(exp, ctxRoot)) {
        if (i !== activeBranchIndex) {
          removeActiveContext()
          ctx = ctxRoot.scope(el)
          ctx.mount(parent, anchor)

          anchor.remove()
          activeBranchIndex = i
        }
        return
      }
    }
    // no matched branch.
    activeBranchIndex = -1
    removeActiveContext()
  })

  return next
}
