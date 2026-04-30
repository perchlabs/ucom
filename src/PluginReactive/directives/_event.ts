import type {
  DirectiveHandler,
} from '../reference.ts'
import { execute } from '../expression.ts'

export const _event: DirectiveHandler = (
  ctx,
  el,
  {
    expr,
    camel: eventName,
  },
) => {
  if (!eventName || !expr) {
    return
  }

  // Create event handler function with access to:
  // - $event: the native event object
  // - $data: the reactive data (via 'with' statement)
  const handler = (e: Event) => {
    try {
      execute(expr, ctx, {$event: e})
    } catch (err) {
      console.error(`[@${eventName}] `, err)
    }
  }

  // Attach the event listener
  el.addEventListener(eventName, handler)

  // Add cleanup to context
  ctx.push(() => el.removeEventListener(eventName, handler))
}
