import type {
  Context,
  DirectiveHandler,
} from '../reference.ts'
import {
  isObject,
  isString,
  isBoolean,
  ArrayFrom,
  ObjectEntriesEach,
  camelToKebab,
  split,
} from '../../common.ts'
import { evaluate } from '../expression.ts'

export const _attribute: DirectiveHandler = (
  ctx,
  el,
  {
    expr,
    kebab: attrName,
  },
) => {
  if (!attrName) {
    return
  }

  // Special handling for 'class' attribute
  if (attrName === 'class') {
    return bindClass(ctx, el as HTMLElement, expr)
  }

  // Special handling for 'style' attribute
  if (attrName === 'style') {
    return bindStyle(ctx, el as HTMLElement, expr)
  }

  // General attribute binding
  const exprReal = expr || attrName
  ctx.effect(() => {
    try {
      const value = evaluate(exprReal, ctx)

      // Handle boolean attributes (disabled, checked, readonly, etc.)
      if (isBoolean(value)) {
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

export function bindClass(ctx: Context, el: HTMLElement, expr: string): undefined {
  if (!expr) {
    return
  }

  // Store original classes from HTML
  const originalClasses = split(el.className)

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
        split(value).forEach(c => classes.add(c))
      }

      // Apply the final class list
      el.className = ArrayFrom(classes).join(' ')
    } catch (e) {
      console.error('[:class] ', e)
    }
  })
}

function bindStyle(ctx: Context, el: HTMLElement, expr: string): undefined {
  if (!expr) {
    return
  }

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
            el.style.setProperty(camelToKebab(prop), `${val}`)
          }
        })
      }
    } catch (e) {
      console.error('[:style] ', e)
    }
  })
}
