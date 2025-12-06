import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import { effect } from '../alien-signals'
import { createSubContext, cleanup } from '../context.ts'
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

  // Extract variable names and array expression
  const itemName = match[3] || match[1] // e.g. "item"
  const indexName = match[2] || 'index' // e.g. "index" or "i"
  const itemsExpr = match[4] // e.g. "items" or "todos"

  // Get the template content
  const isTemplate = el.tagName === 'TEMPLATE'
  const templateContent = isTemplate ? (el as HTMLTemplateElement).content : el

  // Clone the template and remove u-for to prevent infinite loop (if not template tag)
  const template = templateContent.cloneNode(true) as Element
  if (!isTemplate) {
    template.removeAttribute('u-for')
  }

  // Replace original element with a comment marker
  // This marker keeps track of where to insert rendered items
  const parent = getParent(el)
  const marker = document.createComment('u-for')
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
        const clone = template.cloneNode(true) as Element

        // Get actual elements to process
        const elements = isTemplate ? Array.from(clone.children) : [clone]

        elements.forEach(element => {
          // Create a new scoped context with loop variables
          // This adds "item" and "index" to the parent context
          const subctx = createSubContext(ctx, element, {
            [itemName]: item, // e.g. item = "Apple"
            [indexName]: idx // e.g. index = 0
          })
          
          // Process directives on the cloned element
          walk(subctx, element)
          
          // Insert before the marker comment
          parent.insertBefore(element, marker)
          
          // Track for cleanup on next render
          saved.push(element)
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
}
