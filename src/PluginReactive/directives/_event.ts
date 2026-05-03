import type {
  DirectiveHandler,
} from '../reference.ts'
import { execute } from '../expression.ts'

export const _event: DirectiveHandler = (
  ctx,
  el,
  {
    expr,
    camel,
  },
) => {
  if (!camel || !expr) {
    return
  }

  // Create event handler function with access to:
  // - $event: the native event object
  // - $data: the reactive data (via 'with' statement)
  const handler = (e: Event) => {
    try {
      execute(expr, ctx, {$event: e})
    } catch (err) {
      console.error(`[@${camel}] `, err)
    }
  }

  // Attach the event listener
  el.addEventListener(camel, handler)

  // Add cleanup to context
  ctx.push(() => el.removeEventListener(camel, handler))
}
