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
} from '../directive.ts'
import {
  nextWalkable,
} from './utils.ts'

import { _if } from './directives_branch/_if.ts'
import { _each } from './directives_branch/_each.ts'
// import { _each } from './directives_branch/_each_experimental.ts'
import {
  _promise,
  OP_AWAIT, OP_GET, OP_QUERY, OP_POST, OP_PUT, OP_PATCH, OP_DELETE,
} from './directives_branch/_promise.ts'
import { _as } from './directives_branch/_as.ts'

import { _show } from './directives/_show.ts'
import { _text } from './directives/_text.ts'
import { _html } from './directives/_html.ts'
import { _event } from './directives/_event.ts'
import { _attribute } from './directives/_attribute.ts'

import { _data } from './directives/_data.ts'
import { _cssprop } from './directives/_cssprop.ts'
import { _data_cssprop } from './directives/_data_cssprop.ts'
import { _data_text } from './directives/_data_text.ts'
import { _data_html } from './directives/_data_html.ts'
import { _effect } from './directives/_effect.ts'

type HandlerMap = Record<string, DirectiveHandler>
type WalkDefinition = [RegExp, HandlerMap]

type BranchHandlerMap = Record<string, BranchDirectiveHandler>
type BranchWalkDefinition = [RegExp, BranchHandlerMap]

type RunDefinition = [DirectiveDef, DirectiveHandler]

export const walk = (ctx: Context, el: Element): WalkableReturn => {
  const isNormal = !isMetaElement(el)

  let walkDef: WalkDefinition
  if (isNormal) {
    walkDef = containerWalkDef

    const [reBranch, branchMap] = branchWalkDef
    for (const def of getDirectives(el, reBranch)) {
      el.removeAttribute(def.full)
      return branchMap[def.op](ctx, el, def)
    }

  } else {
    walkDef = voidMetaWalkDef
  }

  const [dataRun, normalRun] = [dataWalkDef, walkDef].map(
    ([reFilter, map]: WalkDefinition) =>
    getDirectives(el, reFilter).
    map(def => map[def.op] ? [def, map[def.op]] as RunDefinition : null).
    filter(v => !!v)
  )

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

const makeWalkDefinition = (map: HandlerMap): WalkDefinition => [
  new RegExp('^' + ObjectKeys(map).map(k => RegExp.escape(k)).join('|')),
  map,
]

const makeBranchWalkDefinition = (map: BranchHandlerMap): BranchWalkDefinition => [
  new RegExp('^' + ObjectKeys(map).map(RegExp.escape).join('|')),
  map,
]

const branchWalkDef = makeBranchWalkDefinition({
  '#if': _if,
  '#each': _each,
  '#as': _as,

  [OP_AWAIT]: _promise,
  [OP_GET]: _promise,
  [OP_QUERY]: _promise,
  [OP_POST]: _promise,
  [OP_PUT]: _promise,
  [OP_PATCH]: _promise,
  [OP_DELETE]: _promise,
})

const dataWalkDef = makeWalkDefinition({
  $: _data,
  '$--': _data_cssprop,
  '$%%': _data_text,
  '$!!': _data_html,
})

const containerWalkDef = makeWalkDefinition({
  '#show': _show,
  '+effect': _effect,
  '?': _attribute,
  '@': _event,
  '--': _cssprop,
  '%%': _text,
  '!!': _html,
})

const voidMetaWalkDef = makeWalkDefinition({
  '+effect': _effect,
  '--': _cssprop,
  '%%': _text,
  '!!': _html,
})
