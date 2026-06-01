import type {
  DirectiveHandler,
} from '../reference.ts'
import {
  isMetaElement,
} from '../../common.ts'

export const _text: DirectiveHandler = (
  ctx,
  el,
  {camel, exp, mods},
) => {
  const exprReal = camel ?? exp

  const isMeta = isMetaElement(el)
  const isHTML = mods.has('html')

  if (isHTML) {
    // TODO
  } else {
    const text = new Text()
    if (isMeta) {
      el.before(text)
    } else {
      el.prepend(text)
    }

    ctx.effect(() => {
      try {
        text.textContent = `${ctx.eval(exprReal) ?? ''}`
      } catch (e) {
        console.error('[%] ', e)
      }
    })
  }
}
