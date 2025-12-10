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

export function _for(ctx: Context, el: Element, dir: DirectiveDef) {
  const {value: expr} = dir

  // Parse the expression using regex
  // Matches: "item in items" or "(item, index) in items"
  const match = expr.match(/^\s*(?:\(([^,]+),\s*([^)]+)\)|([^)\s]+))\s+in\s+(.+)$/)
  if (!match) {
    console.error('[u-for] Invalid syntax: ', expr)
    return
  }

  const next = el.nextSibling

  // Extract variable names and array expression
  const itemName = match[3] || match[1] // e.g. "item"
  const indexName = match[2] || 'index' // e.g. "index" or "i"
  const itemsExpr = match[4] // e.g. "items" or "todos"

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
      // Evaluate the array expression
      const items = evaluate(ctx, itemsExpr)

      // Clean up previous render
      saved.forEach(n => {
        cleanup(n)
        n.remove()
      })
      saved = []

      const iter = (item: any, idx: Number) => {
        // Clone the template for this item
        const clone = template.cloneNode(true) as ContextableNode

        const children = isTemplate ? Array.from(clone.children) : [clone as Element]

        children.forEach(child => {
          // Create a new scoped context with loop variables
          // This adds "item" and "index" to the parent context
          const scoped = createScopedContext(child, ctx, {
            [itemName]: item, // e.g. item = "Apple"
            [indexName]: idx // e.g. index = 0
          })

          walk(child, scoped)
          parent.insertBefore(child, marker)
          saved.push(child)
        })
      }

      // Render each item
      if (Number.isInteger(items)) {
        for (let i = 0; i < items as unknown as number; i++) {
          iter(i, i)
        }
      } else if (Array.isArray(items)) {
        items.forEach(iter)
      }
    } catch (e) {
      console.error('[u-for] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)

  return next
}
