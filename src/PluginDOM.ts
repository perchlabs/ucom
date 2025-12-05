import type {
  Plugin,
  PluginStartParams,
  PluginParseParams,
  QueryableRoot,
  ComponentManager,
} from './types.ts'
import {
  ATTR_CORE,
  isValidName,
} from './common.ts'

export default class implements Plugin {
  async start({man}: PluginStartParams) {
    const root = document
    await processTemplates(man, queryForTemplates(root))
    observeMutations(man, root)
  }

  async parse({man, frags}: PluginParseParams) {
    await processTemplates(man, queryForTemplates(frags))
  }
}

async function processTemplates(man: ComponentManager, tplArr: HTMLTemplateElement[]) {
  await templateHandler(tplArr, async (tpl) => {
    const ref = tpl.getAttribute(ATTR_CORE)

    if (ref) {
      tpl.remove()
      const method = isValidName(ref) ? man.define : man.import
      await method(ref, tpl)
    } else {
      // Annonymous bootstrap app
      const ident = await man.define(null, tpl)
      if (ident) {
        tpl.replaceWith(document.createElement(ident.name))
      }
    }
  })
}

function observeMutations(man: ComponentManager, root: QueryableRoot) {
  new MutationObserver(muts => {
    processTemplates(man, getMutationTemplates(muts))
  }).observe(root, {
    childList: true,
    subtree: true,
  })
}

function getMutationTemplates(muts: MutationRecord[]) {
  return [...muts].map(v => [...v.addedNodes])
    .flat()
    .filter(el => el.nodeType === 1)
    .map(el => {
      if (el instanceof HTMLTemplateElement) {
        return el.hasAttribute(ATTR_CORE) ? el : null
      } else if (el instanceof HTMLElement) {
        return queryForTemplates(el)
      }
    })
    .filter(v => !!v)
    .flat()
}

const queryForTemplates = (root: QueryableRoot) => 
  [...root.querySelectorAll(`template[${ATTR_CORE}]`)] as HTMLTemplateElement[]

const templateHandler = (tplArr: HTMLTemplateElement[], fn: (tpl: HTMLTemplateElement) => Promise<void>) =>
  Promise.all(tplArr.map(tpl => fn(tpl)))
