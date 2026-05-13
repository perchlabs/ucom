import type {
  DirectiveHandler,
} from '../reference.ts'

export const _text: DirectiveHandler = (
  ctx,
  el,
  {camel, exp, mods},
) => {
  const exprReal = camel ?? exp
  const prop = mods.has('html') ? 'innerHTML' : 'textContent'

  // Create an effect that automatically re-runs when signals change.
  ctx.effect(() => {
    try {
      el[prop] = ctx.eval(exprReal) as string | undefined ?? ''
    } catch (e) {
      console.error('[text] ', e)
    }
  })
}
