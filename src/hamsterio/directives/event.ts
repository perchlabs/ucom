import type { Context } from '../types.ts'
import { executeStatement } from '../expression.ts'

export function bindEvent(el: HTMLElement, eventName: string, stmt: string, ctx: Context) {
  if (!eventName) return

  // Create event handler function with access to:
  // - $event: the native event object
  // - $el: the element itself
  // - $data: the reactive data (via 'with' statement)
  const handler = (e: Event) => {
    try {
      executeStatement(stmt, ctx, e)
    } catch (err) {
      console.error(`🐹 [u-on:${eventName}] Error: `, err)
    }
  }

  // Attach the event listener
  el.addEventListener(eventName, handler)

  // Add cleanup to context
  ctx.cleanup.push(() => {
    el.removeEventListener(eventName, handler)
  })
}
