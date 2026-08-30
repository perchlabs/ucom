import type {
  // ContextableNode,
  DirectiveHandler,
} from '../reference.ts'
import {
  // isSymbol,
  isMetaElement,
  createDocumentFragment,
  PromiseResolve,
  deleteRange,
} from '../../common.ts'
import {
  signal,
  trigger,
} from '../alien-signals/index.ts'
import {
  TEXT_MOD_HTML,
  STORE_DEFAULT_INDEX,
} from '../reference.ts'
import {
  // contextableParent,
  // parentAndAnchor,
  // createAnchor,
} from '../utils.ts'

// interface Frag {
//   start: Text
//   end: Text
// }



export const _text: DirectiveHandler = (
  ctx,
  elRoot,
  {camel, exp, mods},
) => {
  const exprReal = camel ?? exp

  const isMeta = isMetaElement(elRoot)
  const isHTML = mods.has(TEXT_MOD_HTML)

  let [start, end] = [new Text, new Text]

  const anchor = new Comment()

  if (isMeta) {
    elRoot.before(anchor)
  } else {
    elRoot.append(anchor)
  }

  anchor.before(start)
  anchor.before(end)

  const $text = signal<string[]>([])

  setTimeout(() => {
    ctx.effect(async () => {
      const valRaw = ctx.eval(exprReal ? exprReal : STORE_DEFAULT_INDEX)
      const valResolved = await PromiseResolve(valRaw)
      const val = valResolved instanceof Response ? await valResolved.text() : valResolved

      $text().push(String(val))
      trigger($text)
    })

    ctx.effect(() => {
      const text = $text().at(-1)

      if (text !== undefined) {
        $text([])

        if (isHTML) {
          deleteRange(start, end, false)
          // const range = new Range
          // range.setStartAfter(start)
          // range.setEndBefore(end)
          // range.deleteContents()

          const frag = createDocumentFragment(text)
          end.before(frag)
        } else {
          start.nodeValue = text
        }
      }
    })

  })
}
