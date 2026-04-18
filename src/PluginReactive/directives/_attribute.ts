import type {
  Context,
  DirectiveDef,
} from '../types.ts'
import {
  isObject,
  isString,
  ArrayFrom,
  ObjectEntriesEach,
  kebabize,
} from '../../common.ts'
import { evaluate } from '../expression.ts'

export function _attribute(ctx: Context, dir: DirectiveDef, el: HTMLElement) {
  const {
    ref: attrName,
    expr,
  } = dir

  if (!attrName) return

  // Special handling for 'class' attribute
  if (attrName === 'class') {
    return bindClass(ctx, el, expr)
  }

  // Special handling for 'style' attribute
  if (attrName === 'style') {
    return bindStyle(ctx, el, expr)
  }

  // General attribute binding
  const exprReal = expr ? expr : attrName
  ctx.effect(() => {
    try {
      const value = evaluate(exprReal, ctx)

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
      console.error(`[:${attrName}] `, e)
    }
  })
}

export function bindClass(ctx: Context, el: Element, expr: string): undefined {
  // Store original classes from HTML
  const originalClasses = el.className.split(' ').filter(c => c)

  ctx.effect(() => {
    try {
      const value = evaluate(expr, ctx)
      
      // Start with original classes
      const classes = new Set(originalClasses)
      
      if (isObject(value)) {
        ObjectEntriesEach(value, ([cls, condition]) => {
          if (condition) {
            classes.add(cls)
          }
        })

      } else if (isString(value)) {
        // String (from ternary or direct expression): "bg-blue text-white"
        value.split(' ').filter(c => c).forEach(c => classes.add(c))
      }
      
      // Apply the final class list
      el.className = ArrayFrom(classes).join(' ')
    } catch (e) {
      console.error('[:class] ', e)
    }
  })
}

function bindStyle(ctx: Context, el: HTMLElement, expr: string): undefined {
  // Store original inline styles
  const originalStyle = el.getAttribute('style') || ''

  ctx.effect(() => {
    try {
      const value = evaluate(expr, ctx)

      // Restore original styles first
      el.setAttribute('style', originalStyle)
      
      if (isString(value)) {
        // String: "color: red; font-size: 14px"
        el.style.cssText = `${originalStyle}; ${value}`
      } else if (isObject(value)) {
        // Object: { color: 'red', fontSize: '14px' }
        ObjectEntriesEach(value, ([prop, val]) => {
          if (val != null) {
            // Convert camelCase to kebab-case (fontSize -> font-size)
            el.style.setProperty(kebabize(prop), `${val}`)
          }
        })
      }
    } catch (e) {
      console.error('[:style] ', e)
    }
  })
}
