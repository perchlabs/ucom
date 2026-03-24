import type {
  Context,
  ContextableNode,
  DirectiveDef,
  DirectiveHandlerReturn,
} from '../types.ts'
import { execute } from '../expression.ts'

export function _event(ctx: Context, dir: DirectiveDef, _parent: ContextableNode, el: Element, ): DirectiveHandlerReturn {
  const {
    ref: eventName,
    expr,
  } = dir

  if (!eventName) return

  // Create event handler function with access to:
  // - $event: the native event object
  // - $data: the reactive data (via 'with' statement)
  const handler = (e: Event) => {
    try {
      execute(expr, ctx, {$event: e})
    } catch (err) {
      console.error(`[handle:${eventName}] Error: `, err)
    }
  }

  // Attach the event listener
  el.addEventListener(eventName, handler)

  // Add cleanup to context
  ctx.cleanup.push(() => el.removeEventListener(eventName, handler))
}
