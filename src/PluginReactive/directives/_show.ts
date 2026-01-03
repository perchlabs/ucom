import type { Context, DirectiveDef } from '../types.ts'
import { effect } from '../alien-signals'
import { evaluate } from '../expression.ts'

const attrSplitFilter = (el: HTMLElement, key: string) => el.getAttribute(key)?.split(' ').filter(c => c)

export function _show(ctx: Context, el: HTMLElement, dir: DirectiveDef) {
  const {value: expr} = dir
  // expr: string

  // Store original display value to restore when showing (i.e. flex/grid, etc)
  let originalDisplay = getComputedStyle(el).display
  let isCurrentlyVisible = originalDisplay !== 'none'

  // If already hidden, set to empty string to let CSS decide
  if (originalDisplay === 'none') {
    originalDisplay = ''
  }

  // Store transition classes (if present)
  const enterClass = attrSplitFilter(el, 'u-show-enter')
  const leaveClass = attrSplitFilter(el, 'u-show-leave')

  const dispose = effect(() => {
    try {
      // Evaluate expression as boolean
      const show = evaluate(expr, ctx)

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
      console.error('[u-show] Error: ', e)
    }
  })

  // Track effect disposal
  ctx.cleanup.push(dispose)
}
