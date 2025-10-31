import type { Context } from './context'
import type { Directive } from './directives'
import { builtInDirectives } from './directives'
import { _if } from './directives/if'
import { _is } from './directives/is'
import { _for } from './directives/for'
import { bind } from './directives/bind'
import { on } from './directives/on'
import { text } from './directives/text'
import { evaluate } from './eval'
import { checkAttr } from './utils'
import { ref } from './directives/ref'
import { createScopedContext } from './context'

const dirRE = /^(?:u-|:|@)/
const dirBasicRE = /^(u-[a-z]+)$/
const modifierRE = /\.([\w-]+)/g

export let inOnce = false
export const walk = (node: Node, ctx: Context): ChildNode | null | void => {
  const type = node.nodeType
  if (type === 1) {
    // Element
    const el = node as Element

    if (el.hasAttribute('u-pre')) {
      return
    }
    if (el.hasAttribute('u-com')) {
      return
    }

    checkAttr(el, 'u-cloak')

    let exp: string | null

    // u-if
    if ((exp = checkAttr(el, 'u-if'))) {
      return _if(el, exp, ctx)
    }

    // u-is
    if ((exp = checkAttr(el, 'u-is'))) {
      return _is(el, exp, ctx)
    }

    // u-for
    if ((exp = checkAttr(el, 'u-for'))) {
      return _for(el, exp, ctx)
    }

    // u-scope
    if ((exp = checkAttr(el, 'u-scope')) || exp === '') {
      const scope = exp ? evaluate(ctx.scope, exp) : {}
      ctx = createScopedContext(ctx, scope)
    }

    // u-once
    const hasOnce = checkAttr(el, 'u-once') != null
    if (hasOnce) {
      inOnce = true
    }

    // ref
    if ((exp = checkAttr(el, 'ref'))) {
      applyDirective(el, ref, `"${exp}"`, ctx)
    }

    // process children first before self attrs
    walkChildren(el, ctx)
    // other directives
    const deferred: [string, string][] = []
    for (const { name, value } of [...el.attributes]) {
      if (!dirRE.test(name)) {
        continue
      }

      if (name === 'u-model') {
        // defer u-model since it relies on :value bindings to be processed
        // first, but also before u-on listeners (#73)
        deferred.unshift([name, value])
      } else if (name[0] === '@' || /^u-on\b/.test(name)) {
        deferred.push([name, value])
      } else {
        // Allow other 'u-' prefixed directives to be used outside of this library.
        if (dirBasicRE.test(name)) {
          const dirName = name.slice(2)
          if (!(dirName in builtInDirectives || dirName in ctx.dirs)) {
            continue
          }
        }

        processDirective(el, name, value, ctx)
      }
    }
    for (const [name, value] of deferred) {
      processDirective(el, name, value, ctx)
    }

    if (hasOnce) {
      inOnce = false
    }
  } else if (type === 3) {
    // Text
    const data = (node as Text).data
    if (data.includes(ctx.delimiters[0])) {
      let segments: string[] = []
      let lastIndex = 0
      let match
      while ((match = ctx.delimitersRE.exec(data))) {
        const leading = data.slice(lastIndex, match.index)
        if (leading) segments.push(JSON.stringify(leading))
        segments.push(`$s(${match[1]})`)
        lastIndex = match.index + match[0].length
      }
      if (lastIndex < data.length) {
        segments.push(JSON.stringify(data.slice(lastIndex)))
      }
      applyDirective(node, text, segments.join('+'), ctx)
    }
  } else if (type === 11) {
    walkChildren(node as DocumentFragment, ctx)
  }
}

const walkChildren = (node: Element | DocumentFragment, ctx: Context) => {
  let child = node.firstChild
  while (child) {
    child = walk(child, ctx) || child.nextSibling
  }
}

const processDirective = (
  el: Element,
  raw: string,
  exp: string,
  ctx: Context
) => {
  let dir: Directive
  let arg: string | undefined
  let modifiers: Record<string, true> | undefined

  // modifiers
  raw = raw.replace(modifierRE, (_, m: string) => {
    modifiers ??= {}
    modifiers[m] = true
    return ''
  })

  if (raw[0] === ':') {
    dir = bind
    arg = raw.slice(1)
  } else if (raw[0] === '@') {
    dir = on
    arg = raw.slice(1)
  } else {
    const argIndex = raw.indexOf(':')
    const dirName = argIndex > 0 ? raw.slice(2, argIndex) : raw.slice(2)
    dir = builtInDirectives[dirName] || ctx.dirs[dirName]
    arg = argIndex > 0 ? raw.slice(argIndex + 1) : undefined
  }
  if (dir) {
    if (dir === bind && arg === 'ref') dir = ref
    applyDirective(el, dir, exp, ctx, arg, modifiers)
    el.removeAttribute(raw)
  } else {
    console.error(`unknown custom directive ${raw}.`)
  }
}

const applyDirective = (
  el: Node,
  dir: Directive<any>,
  exp: string,
  ctx: Context,
  arg?: string,
  modifiers?: Record<string, true>
) => {
  const get = (e = exp) => evaluate(ctx.scope, e, el)
  const cleanup = dir({
    el,
    get,
    effect: ctx.effect,
    ctx,
    exp,
    arg,
    modifiers
  })
  if (cleanup) {
    ctx.cleanups.push(cleanup)
  }
}
