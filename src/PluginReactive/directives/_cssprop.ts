import type {
  DirectiveHandler,
} from '../reference.ts'
import {
  isShadowRoot,
  createElement,
  isMetaElement,
} from '../../common.ts'
import {
  contextableParent,
} from '../utils.ts'

export const _cssprop: DirectiveHandler = (
  ctx,
  el,
  {
    camel,
    kebab,
    exp,
    mods,
  },
) => {
  if (!camel || !kebab) {
    return
  }

  const exprReal = exp || camel
  if (!exprReal) {
    return
  }
  const propName = `--${kebab}`

  let style: HTMLStyleElement
  let metaScope: string
  if (isMetaElement(el)) {
    style = createElement('style')
    el.before(style)
    metaScope = isShadowRoot(contextableParent(style)) ? `:host` : '@scope'
  }

  ctx.effect(() => {
    try {
      let value = ctx.eval(exprReal) as string
      if (mods.has('escape')) {
        value = `"${CSS.escape(value)}"`
      }

      if (style) {
        style.textContent = `${metaScope} { ${propName}: ${value}; }`
      } else {
        (el as HTMLElement)?.style.setProperty(propName, value)
      }
    } catch (e) {
      console.error(`[${propName}] `, e)
    }
  })
}
