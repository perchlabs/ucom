import type {
  Context,
  ContextableElement,
  ProxyStore,
} from './types.ts'
import { getDirectives, getParent } from './utils.ts'
import { createEffect } from './signal.ts'
import { evaluate } from './expression.ts'
import { contexts, createContext, createSubContext } from './context.ts'
import { bindTextOrHTML } from './directives/textOrHtml.ts'
import { bindShow } from './directives/show.ts'
import { bindEvent } from './directives/event.ts'
import { bindAttribute } from './directives/attribute.ts'
import { bindRef } from './directives/ref.ts'

export function initRoot(root: ShadowRoot, proxyStore: ProxyStore) {
  const ctx = createContext(root, proxyStore)
  Array.from(root.children).forEach(child => processElement(ctx, child))
  return ctx
}

function processElement(ctx: Context, el: Element) {
  // Skip text nodes, comments, etc - only process element nodes
  if (el.nodeType !== 1) return

  if (!ctx) return

  const {directives, hitmap} = getDirectives(el)
  const has = (names: string[]) => {
    for (const name of names) {
      if (name in hitmap) {
        return true
      }
    }
    return false
  }

  directivesLoop: for (const {directive, modifier, value} of Object.values(directives)) {
    switch(directive) {
    case 'u-show':
      bindShow(ctx, el as HTMLElement, value)
      break
    case 'u-for':
      bindFor(ctx, el, value)
      break directivesLoop
    case 'u-is':
      bindIs(ctx, el, value)
      break
    case 'u-bind':
      bindAttribute(ctx, el as HTMLElement, modifier, value)
      break
    case 'u-on':
      bindEvent(ctx, el, modifier, value)
      break
    case 'u-text':
      bindTextOrHTML(ctx, el as HTMLElement, value)
      break
    case 'u-html':
      bindTextOrHTML(ctx, el as HTMLElement, value, true)
      break
    case 'u-ref':
      bindRef(ctx, el, value, modifier === 'global')
    }
  }


  if (!has(['u-for', 'u-is'])) {
    Array.from(el.children).forEach(child => processElement(ctx, child))
  }
}

function bindFor(ctx: Context, el: Element, expr: string) {
  // Parse the expression using regex
  // Matches: "item in items" or "(item, index) in items"
  const match = expr.match(/^\s*(?:\(([^,]+),\s*([^)]+)\)|([^)\s]+))\s+in\s+(.+)$/)
  if (!match) {
    console.error('🐹 [u-for] Invalid syntax: ', expr)
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
  const dispose = createEffect(() => {
    try {
      // Evaluate the array expression
      const items = evaluate(itemsExpr, ctx)

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
          const subCtx = createSubContext(ctx, element, {
            [itemName]: item, // e.g. item = "Apple"
            [indexName]: idx // e.g. index = 0
          })
          
          // {
          //   el: element,
          //   data: {
          //     ...ctx.data,
          //     [itemName]: item, // e.g. item = "Apple"
          //     [indexName]: idx // e.g. index = 0
          //   },
          //   cleanup: [],
          // }

          // Store scoped context for this cloned element
          contexts.set(element, subCtx)
          
          // Process directives on the cloned element
          processElement(subCtx, element)
          
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
      console.error('🐹 [u-for] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}

export function bindIs(ctx: Context, el: Element, expr: string) {
  if (!expr.trim()) {
    return console.warn(`u-is expression cannot be empty.`)
  }

  if (!(el instanceof HTMLTemplateElement)) {
    return console.warn(`u-is may only be placed on a template.`)
  }

  const parent = getParent(el)
  const anchor = new Comment('u-is')
  parent.insertBefore(anchor, el)
  parent.removeChild(el)

  let tagName = ''
  let tag: Element | undefined

  const dispose = createEffect(() => {
    const v = evaluate(expr, ctx)
    if (!v || v === tagName) {
      return
    }

    if (tag) {
      parent.insertBefore(anchor, tag)
      cleanup(tag)
      tag.remove()
    }

    tagName = v
    tag = document.createElement(tagName)

    for (const {name, value} of Array.from(el.attributes).filter(({name}) => name !== 'u-is')) {
      tag.setAttribute(name, value)
    }
    processElement(ctx, tag)

    parent.insertBefore(tag, anchor)
    parent.removeChild(anchor)
  })

  ctx.cleanup.push(dispose)
}

export function cleanup(el: ContextableElement) {
  if (el == null) {
    console.warn('🐹 [cleanup] Called on a null/undefined element.')
    return
  }

  const ctx = contexts.get(el)
  if (!ctx) return
  
  // Run all cleanup functions
  ctx.cleanup?.forEach(fn => fn())
  
  // Remove context (and cleanup array) from WeakMap
  contexts.delete(el)
}
