import type { Context, DirectiveDef } from '../types.ts'
import { execute } from '../expression.ts'

export function dirEvent(ctx: Context, el: Element, dir: DirectiveDef) {
  const {
    modifier: eventName,
    value: stmt,
  } = dir

  if (!eventName) return

  // Create event handler function with access to:
  // - $event: the native event object
  // - $el: the element itself
  // - $data: the reactive data (via 'with' statement)
  const handler = (e: Event) => {
    try {
      execute(ctx, stmt, e)
    } catch (err) {
      console.error(`[u-on:${eventName}] Error: `, err)
    }
  }

  // Attach the event listener
  el.addEventListener(eventName, handler)

  // Add cleanup to context
  ctx.cleanup.push(() => el.removeEventListener(eventName, handler))
}
