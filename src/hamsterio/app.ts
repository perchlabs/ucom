import type {
  Context,
  ProxyStore,
} from './types.ts'
import { createEffect } from './signal.ts'
import { evaluateExpression } from './expression.ts'
import { contexts, createContext } from './context.ts'
import { bindTextOrHTML } from './directives/textOrHtml.ts'
import { bindShow } from './directives/show.ts'
import { bindEvent } from './directives/event.ts'
import { bindAttribute } from './directives/attribute.ts'

export function initRoot(root: ShadowRoot, proxyStore: ProxyStore) {
  const ctx = createContext(root, proxyStore)
  Array.from(root.children).forEach(child => processElement(child, ctx))
  return ctx
}

function processElement(el: Element, ctx: Context) {
// Skip text nodes, comments, etc - only process element nodes
  if (el.nodeType !== 1) return

  if (!(el instanceof HTMLElement)) {
    return
  }

  // const ctx = getContext(el)
  if (!ctx) {
    return
  }

// Process all other directives on this element
  getDirectives(el).forEach(({name, value}) => {
    // Split directive name to handle modifiers
    // (e.g. "u-on:click" -> ["u-on", "click"])
    const [directive, modifier] = name.split(':')
    
    switch(directive) {
    case 'u-text':
      bindTextOrHTML(el, value, ctx)
      break
    case 'u-html':
      bindTextOrHTML(el, value, ctx, true)
      break
    case 'u-show':
      bindShow(el, value, ctx)
      break
    case 'u-for':
      bindFor(el, value, ctx)
      break
    case 'u-on':
      bindEvent(el, modifier, value, ctx)
      break
    case 'u-bind':
      bindAttribute(el, modifier, value, ctx)
      break
    }
  })

  // Process children recursively (unless u-for handled it)
  if (!el.hasAttribute('u-for')) {
    Array.from(el.children).forEach(child => processElement(child, ctx))
  }
}

function getDirectives(el: Element) {
  return Array.from(el.attributes)
    .filter(attr => attr.name.startsWith('u-'))
    .map(attr => ({ name: attr.name, value: attr.value }))
}

function bindFor(el: HTMLElement, expr: string, ctx: Context) {
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
  const template = templateContent.cloneNode(true) as HTMLElement
  if (!isTemplate) {
    template.removeAttribute('u-for')
  }

  // Replace original element with a comment marker
  // This marker keeps track of where to insert rendered items
  const parent = el.parentElement
  if (!parent) {
    return
  }
  const marker = document.createComment('u-for')
  parent.replaceChild(marker, el)

  // Keep track of rendered nodes for cleanup
  let saved: Element[] = []

  // Create effect that re-renders whenever array changes
  const dispose = createEffect(() => {
    try {
      // Evaluate the array expression
      const items = evaluateExpression(itemsExpr, ctx)

      // Clean up previous render
      saved.forEach(n => {
        cleanup(n)
        n.remove()
      })
      saved = []

      // Ensure we have an array
      if (!Array.isArray(items)) return

      // Render each item
      items.forEach((item, idx) => {
        // Clone the template for this item
        const clone = template.cloneNode(true) as Element

        // Get actual elements to process
        const elements = isTemplate 
          ? Array.from(clone.children) 
          : [clone]

        elements.forEach(element => {
          // Create a new scoped context with loop variables
          // This adds "item" and "index" to the parent context
          const scopedData = {
            ...ctx.data,
            [itemName]: item, // e.g. item = "Apple"
            [indexName]: idx // e.g. index = 0
          }

          // Store scoped context for this cloned element
          contexts.set(element, {
            el: element,
            data: scopedData,
            cleanup: [],
          })
          
          // Process directives on the cloned element
          processElement(element, ctx)
          
          // Insert before the marker comment
          parent.insertBefore(element, marker)
          
          // Track for cleanup on next render
          saved.push(element)
        })
      })
    } catch (e) {
      console.error('🐹 [u-for] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}

export function cleanup(el: Element | ShadowRoot) {
  if (el == null) {
    console.warn('🐹 [cleanup] Called on a null/undefined element.');
    return;
  }

  const ctx = contexts.get(el);
  if (!ctx) return;
  
  // Run all cleanup functions
  ctx.cleanup?.forEach(fn => fn());
  
  // Remove context (and cleanup array) from WeakMap
  contexts.delete(el);

  // Also cleanup any nested u-data children
  // el.querySelectorAll('[u-data]').forEach(child => cleanup(child))
}

// function getData(el: Element) {
//   const expr = el.getAttribute('u-data') ?? ''
//   if (expr.trim()) {
//     try {
//       // Parse the JavaScript object expression
//       // (e.g. "{ count: 0 }" becomes an actual object)
//       const fn = new Function(`return ${expr}`)
//       return fn()
//     } catch (e) {
//       console.error('🐹 [u-data] Parse error: ', e)
//     }
//   }
//   return {}
// }
