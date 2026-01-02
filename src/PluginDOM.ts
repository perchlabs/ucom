import type {
  Plugin,
  PluginStartParams,
  PluginParseParams,
  QueryableRoot,
  ComponentManager,
} from './types.ts'
import {
  ATTR_CORE,
  isValidComponentName,
} from './common.ts'

export default class implements Plugin {
  async start({man}: PluginStartParams) {
    const root = document
    await processTemplates(man, queryForTemplates(root))
    observeMutations(man, root)
  }

  async parse({man, frag}: PluginParseParams) {
    await processTemplates(man, queryForTemplates(frag))
  }
}

const processTemplates = async (
  man: ComponentManager,
  tplArr: HTMLTemplateElement[],
) => templateHandler(tplArr, async (tpl) => {
  const ref = tpl.getAttribute(ATTR_CORE)

  if (ref) {
    tpl.remove()
    const method = isValidComponentName(ref) ? man.define : man.import
    await method(ref, tpl)
  } else {
    // Annonymous bootstrap app
    const ident = await man.define(null, tpl)
    if (ident) {
      tpl.replaceWith(document.createElement(ident.name))
    }
  }
})

const observeMutations = (
  man: ComponentManager,
  root: QueryableRoot,
) => new MutationObserver(muts => {
  processTemplates(man, getMutationTemplates(muts))
}).observe(root, {
  childList: true,
  subtree: true,
})

const getMutationTemplates = (muts: MutationRecord[]) => {
  const elements = [...muts]
    .map(v => [...v.addedNodes])
    .flat()
    .filter(el => el.nodeType === 1) as Element[]

  return elements
    .map(el => el.tagName == 'TEMPLATE'
      ? el.hasAttribute(ATTR_CORE) ? el as HTMLTemplateElement: null
      : queryForTemplates(el)
    )
    .filter(v => !!v)
    .flat()
}

const queryForTemplates = (root: QueryableRoot) => [...(
  root.querySelectorAll?.(`template[${ATTR_CORE}]`) ?? []
)] as HTMLTemplateElement[]

const templateHandler = (
  tplArr: HTMLTemplateElement[],
  fn: (tpl: HTMLTemplateElement) => Promise<void>,
) => Promise.all(tplArr.map(tpl => fn(tpl)))
