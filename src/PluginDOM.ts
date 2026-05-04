import type {
  Plugin,
  PluginParseParams,
  QueryableRoot,
  ComponentManager,
} from './reference.ts'
import {
  SYS_CODE,
} from './reference.ts'
import {
  isElement,
  createElement,
  isValidComponentName,
  queryAll,
  isTemplateElement,
  observeMutations,
} from './common.ts'

export default {
  async start(man: ComponentManager) {
    await processTemplates(man, queryForTemplates(document))

    observeMutations(document, muts =>
      processTemplates(man,
        [...muts].
        flatMap(v => [...v.addedNodes]).
        filter(isElement).
        flatMap(el =>
          isTemplateElement(el) && el.hasAttribute(SYS_CODE)
          ? el
          : queryForTemplates(el)
        )
      )
    )
  },

  async parse({man, frag}: PluginParseParams) {
    await processTemplates(man, queryForTemplates(frag))
  },
} as Plugin

const processTemplates = async (
  man: ComponentManager,
  tplArr: HTMLTemplateElement[],
) => templateHandler(tplArr, async (tpl) => {
  const ref = tpl.getAttribute(SYS_CODE)

  if (ref) {
    tpl.remove()
    const method = isValidComponentName(ref) ? man.define : man.get
    await method(ref, tpl)
  } else {
    // Annonymous bootstrap app
    const ident = await man.define(null, tpl)
    if (ident) {
      tpl.replaceWith(createElement(ident.name))
    }
  }
})

const queryForTemplates = (root: QueryableRoot) => queryAll<HTMLTemplateElement>(root, `template[${SYS_CODE}]`)

const templateHandler = (
  tplArr: HTMLTemplateElement[],
  fn: (tpl: HTMLTemplateElement) => Promise<void>,
) => Promise.all(tplArr.map(tpl => fn(tpl)))
