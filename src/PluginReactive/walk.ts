import type {
  DirectiveDef,
} from '../reference.ts'
import type {
  Context,
  ContextableNode,
  BranchDirectiveHandler,
  DirectiveHandler,
  WalkableReturn,
} from './reference.ts'
import {
  isMetaElement,
  ObjectKeys,
} from '../common.ts'
import {
  getDirectives,
  pullDir,
} from '../directive.ts'
import {
  nextWalkable,
} from './utils.ts'

import { _if } from './directives_branch/_if.ts'
import { _each } from './directives_branch/_each.ts'
// import { _each } from './directives_branch/_each_experimental.ts'
import { _await } from './directives_branch/_await.ts'
import { _as } from './directives_branch/_as.ts'

import { _show } from './directives/_show.ts'
import { _text } from './directives/_text.ts'
import { _event } from './directives/_event.ts'
import { _attribute } from './directives/_attribute.ts'
import { _ref } from './directives/_ref.ts'

import { _data } from './directives/_data.ts'
import { _cssprop } from './directives/_cssprop.ts'
import { _data_cssprop } from './directives/_data_cssprop.ts'
import { _effect } from './directives/_effect.ts'

type HandlerMap = Record<string, DirectiveHandler>
type WalkDefinition = [RegExp, HandlerMap]
type RunDefinition = [DirectiveDef, DirectiveHandler]

export const walk = (ctx: Context, el: Element): WalkableReturn => {
  const isNormal = !isMetaElement(el)

  let walkDef: WalkDefinition
  if (isNormal) {
    walkDef = containerWalkDef

    let def: DirectiveDef | undefined
    for (const [key, handler] of branchDirs) {
      if (def = pullDir(el, key)) {
        return handler(ctx, el, def)
      }
    }
  } else {
    walkDef = voidMetaWalkDef
  }

  const [dataRun, normalRun] = [dataWalkDef, walkDef].map(
    ([reFilter, map]: WalkDefinition) =>
      getDirectives(el, reFilter).
      map(def => map[def.op] ? [def, map[def.op]] as RunDefinition : null).
      filter(v => !!v))

  if (isNormal && (dataRun.length || normalRun.length)) {
    ctx = ctx.scope(el)
  }

  const run = (runDefs: RunDefinition[]) => runDefs.forEach(([def, handler]) => handler(ctx, el, def))

  run(dataRun)
  if (isNormal) {
    walkChildren(ctx, el)
  }
  run(normalRun)

  if (!isNormal) {
    const next = nextWalkable(el)
    el.remove()
    return next
  }
}

export const walkChildren = (ctx: Context, node: ContextableNode = ctx.walkable) => {
  let child: WalkableReturn = node.firstElementChild
  while (child) {
    child = walk(ctx, child) ?? nextWalkable(child)
  }
}

// These directives must match exact string
const branchDirs: [string, BranchDirectiveHandler][] = [
  ['#if', _if],
  ['#each', _each],
  ['#as', _as],
  ['#await', _await],
]

const makeWalkDefinition = (map: HandlerMap): WalkDefinition => [
  new RegExp('^' + ObjectKeys(map).map(k => RegExp.escape(k)).join('|')),
  map,
]

const dataWalkDef = makeWalkDefinition({
  $: _data,
  '$--': _data_cssprop,
})

const containerWalkDef = makeWalkDefinition({
  '#show': _show,
  '#effect': _effect,
  '#ref': _ref,
  '?': _attribute,
  '@': _event,
  '--': _cssprop,
  '%': _text,
})

const voidMetaWalkDef = makeWalkDefinition({
  '#effect': _effect,
  '--': _cssprop,
  '%': _text,
})
