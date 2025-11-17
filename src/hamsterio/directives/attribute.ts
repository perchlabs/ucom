import type { Context } from '../types.ts'
import { createEffect } from '../signal.ts'
import { evaluateExpression } from '../expression.ts'

export function bindAttribute(el: HTMLElement, attrName: string, expr: string, ctx: Context) {
  if (!attrName) return

  // Special handling for 'class' attribute
  if (attrName === 'class') {
    bindClass(el, expr, ctx)
    return
  }

  // Special handling for 'style' attribute
  if (attrName === 'style') {
    bindStyle(el, expr, ctx)
    return
  }

  // General attribute binding
  const dispose = createEffect(() => {
    try {
      const value = evaluateExpression(expr, ctx)
      
      // Handle boolean attributes (disabled, checked, readonly, etc.)
      if (typeof value === 'boolean') {
        if (value) {
          el.setAttribute(attrName, '')
        } else {
          el.removeAttribute(attrName)
        }
      }
      // Handle null/undefined - remove attribute
      else if (value == null) {
        el.removeAttribute(attrName)
      }
      // Normal attribute value
      else {
        el.setAttribute(attrName, value)
      }
    } catch (e) {
      console.error(`🐹 [u-bind:${attrName}] Error: `, e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}

export function bindClass(el: HTMLElement, expr: string, ctx: Context) {
  // Store original classes from HTML
  const originalClasses = el.className.split(' ').filter(c => c)
    
  const dispose = createEffect(() => {
    try {
      const value = evaluateExpression(expr, ctx)
      
      // Start with original classes
      const classes = new Set(originalClasses)
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Object: { 'active': isActive, 'disabled': isDisabled }
        for (const [cls, condition] of Object.entries(value)) {
          if (condition) {
            classes.add(cls)
          }
        }
      } else if (typeof value === 'string') {
          // String (from ternary or direct expression): "bg-blue text-white"
          value.split(' ').filter(c => c).forEach(c => classes.add(c))
      }
      
      // Apply the final class list
      el.className = Array.from(classes).join(' ')
    } catch (e) {
      console.error('🐹 [u-bind:class] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}

function bindStyle(el: HTMLElement, expr: string, ctx: Context) {
  // Store original inline styles
  const originalStyle = el.getAttribute('style') || ''
    
  const dispose = createEffect(() => {
    try {
      const value = evaluateExpression(expr, ctx)
      
      // Restore original styles first
      el.setAttribute('style', originalStyle)
      
      if (typeof value === 'string') {
        // String: "color: red; font-size: 14px"
        el.style.cssText = originalStyle + '; ' + value
      }
      else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Object: { color: 'red', fontSize: '14px' }
        for (const [prop, val] of Object.entries(value)) {
          if (val != null) {
            // Convert camelCase to kebab-case (fontSize -> font-size)
            const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase()
            el.style.setProperty(cssProp, String(val))
          }
        }
      }
    } catch (e) {
      console.error('🐹 [u-bind:style] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}
