import type { Context } from '../types.ts'
import { createEffect } from '../signal.js'
import { evaluateExpression } from '../expression.ts'

export function bindShow(el: HTMLElement, expr: string, ctx: Context) {
  // Store original display value to restore when showing (i.e. flex/grid, etc)
  let originalDisplay = getComputedStyle(el).display
  let isCurrentlyVisible = originalDisplay !== 'none'

  // If already hidden, set to empty string to let CSS decide
  if (originalDisplay === 'none') {
    originalDisplay = ''
  }

  // Store transition classes (if present)
  const enterClass = el.getAttribute('u-transition-enter')?.split(' ').filter(c => c)
  const leaveClass = el.getAttribute('u-transition-leave')?.split(' ').filter(c => c)

  const dispose = createEffect(() => {
    try {
      // Evaluate expression as boolean
      const show = evaluateExpression(expr, ctx)

      // Showing
      if (show) {
        // Has transition
        if (enterClass) {
          el.style.display = originalDisplay || ''
          isCurrentlyVisible = true
      
          requestAnimationFrame(() => {
            if (leaveClass) {
              el.classList.remove(...leaveClass)
            }

            el.classList.add(...enterClass)
          })
        // No transition
        } else {
          el.style.display = originalDisplay || ''
          isCurrentlyVisible = true
        }
      // Hiding
      } else {
        // Has transition
        if (leaveClass) {
          if (enterClass) {
            el.classList.remove(...enterClass)
          }

          el.classList.add(...leaveClass)
          
          const onTransitionEnd = () => {
            el.style.display = 'none'
            isCurrentlyVisible = false
            el.removeEventListener('transitionend', onTransitionEnd)
            el.removeEventListener('animationend', onTransitionEnd)
          }
          
          if (isCurrentlyVisible) {
            el.addEventListener('transitionend', onTransitionEnd)
            el.addEventListener('animationend', onTransitionEnd)
          }
        // No transition
        } else {
          el.style.display = 'none'
          isCurrentlyVisible = false
        }
      }
    } catch (e) {
      console.error('🐹 [u-show] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}
