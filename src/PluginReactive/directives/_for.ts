import type {
  Context,
  ContextableNode,
  DirectiveDef,
} from '../types.ts'
import { effect } from '../alien-signals'
import { createScopedContext, cleanup } from '../context.ts'
import { evaluate } from '../expression.ts'
import { getParent } from '../utils.ts'
import { walk } from '../walk.ts'

const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
const stripParensRE = /^\(|\)$/g
const destructureRE = /^[{[]\s*((?:[\w_$]+\s*,?\s*)+)[\]}]$/

export function _for(ctx: Context, el: Element, dir: DirectiveDef) {
  const {value: expr} = dir

  const next = el.nextSibling

  const inMatch = expr.match(forAliasRE)
  if (!inMatch) {
    console.warn(`invalid u-for expression: ${expr}`)
    return next
  }

  const itemsExp = inMatch[2].trim()
  let valueExp = inMatch[1].trim().replace(stripParensRE, '').trim()
  let destructureBindings: string[] | undefined
  let isArrayDestructure = false
  let indexName = 'index'
  // let objIndexExp: string | undefined

  let match
  if ((match = valueExp.match(forIteratorRE))) {
    valueExp = valueExp.replace(forIteratorRE, '').trim()
    indexName = match[1].trim()
    // if (match[2]) {
    //   objIndexExp = match[2].trim()
    // }
  }

  if ((match = valueExp.match(destructureRE))) {
    destructureBindings = match[1].split(',').map((s) => s.trim())
    isArrayDestructure = valueExp[0] === '['
  }
  const itemName = valueExp

  // Get the template content
  const isTemplate = el.tagName === 'TEMPLATE'
  const templateContent =  isTemplate ? (el as HTMLTemplateElement).content : el

  // Clone the template.
  const template = templateContent.cloneNode(true) as Element

  // Replace original element with a comment marker
  // This marker keeps track of where to insert rendered items
  const parent = getParent(el)
  const marker = document.createComment(dir.key)
  parent.replaceChild(marker, el)

  // Keep track of rendered nodes for cleanup
  let saved: Element[] = []

  // Create effect that re-renders whenever array changes
  const dispose = effect(() => {
    try {
      // Clean up previous render
      saved.forEach(n => {
        cleanup(n)
        n.remove()
      })
      saved = []

      // Evaluate the array expression
      let items = evaluate(itemsExp, ctx)
      if (Number.isInteger(items)) {
        items = [...Array(items).keys()]
      }
      if (!Array.isArray(items)) {
        return
      }

      items.forEach((item: any, idx: Number) => {
        const data: Record<string, any> = {
          [indexName]: idx,
        }

        if (destructureBindings) {
          destructureBindings.forEach((b, i) => {
            data[b] = item[isArrayDestructure ? i : b]
          })
        } else {
          data[itemName] = item
        }

        // Clone the template for this item
        const clone = template.cloneNode(true) as ContextableNode

        const children = isTemplate ? Array.from(clone.children) : [clone as Element]

        children.forEach(child => {
          // Create a new scoped context with loop variables
          const scoped = createScopedContext(child, ctx, {...data})

          walk(child, scoped)
          parent.insertBefore(child, marker)
          saved.push(child)
        })
      })

    } catch (e) {
      console.error('[u-for] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)

  return next
}
