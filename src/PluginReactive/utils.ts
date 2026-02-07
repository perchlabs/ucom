import type {
  ParamModKey,
} from '../types.ts'
import type {
  ContextableNode,
  ParamVarDef,
} from './types.ts'
import {
  PARAM_MOD_VAR,
  PARAM_TOP_MODS,
  PARAM_BODY_MODS,
} from '../constants.ts'
import {
  getAttributes,
  $attr,
} from '../common.ts'
import { evaluate } from './expression.ts'

export function getParent(el: ContextableNode): ContextableNode {
  return el.parentElement ?? el.getRootNode() as ShadowRoot
}

export function makeElementAs(el: Element, tagName: string) {
  const tag = document.createElement(tagName)
  for (const {name, value} of Array.from(el.attributes)) {
    tag.setAttribute(name, value)
  }

  if (el instanceof HTMLTemplateElement) {
    tag.append(el.content)
  } else {
    tag.innerHTML = el.innerHTML
  }

  return tag
}

const reParamKey = /^\$([a-z]+)(\.[a-z]+)?$/

export function parseParam(el: HTMLParamElement, parent?: DocumentFragment) {
  const varDefs: Record<string, ParamVarDef> = {}

  const top = parent ? el.parentNode === parent : el.parentNode instanceof ShadowRoot

  const castVal = $attr(el, 'cast', null)
  const cast = castVal
    ? evaluate(`${castVal}`) as (value: string) => any
    : undefined

  const vars = getAttributes(el)
    .filter(([k]) => k.startsWith('$'))
  vars.forEach(([line, expr]) => {
    const matches = line.match(reParamKey)
    if (!matches) {
      console.warn(`Invalid param line '${line}'`)
      return
    }
    const [,k, modRaw] = matches
    const mod = modRaw ? modRaw.slice(1) : PARAM_MOD_VAR
    if (!(mod in PARAM_TOP_MODS)) {
      console.warn(`Invalid param modifier '${mod}'`)
      return
    }
    if (!top && !(mod in PARAM_BODY_MODS)) {
      console.warn(`Invalid param modifier, must be top-level '${mod}'`)
      return
    }

    varDefs[k] = {
      k,
      expr,
      cast,
      top,
      mod: mod as ParamModKey,
    }
  })

  return varDefs
}
