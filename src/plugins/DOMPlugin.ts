import type {
  Plugin,
  PluginStartParams,
  PluginParseParams,
  QueryableRoot,
  ComponentManager,
} from '../core'
import {
  ATTR_CORE,
} from '../core'

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
      if (/^[a-z]+\-[a-z0-9]+$/.test(ref)) {
        // Strict component name
        await man.define(ref, tpl)
      } else {
        // Contains path characters
        // This allows for server side inline definitions that still allows relative component paths.
        await man.import(ref, tpl)
      }
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

function queryForTemplates(root: QueryableRoot) {
  return [...root.querySelectorAll(`template[${ATTR_CORE}]`)]
    .filter(v => v instanceof HTMLTemplateElement)
}

function getMutationTemplates(muts: MutationRecord[]) {
  const has = (el: Element) => el.hasAttribute(ATTR_CORE)

  return [...muts].map(v => [...v.addedNodes])
    .flat()
    .filter(el => el.nodeType === 1)
    .map(el => {
      if (el instanceof HTMLTemplateElement) {
        return has(el) ? el : null
      } else if (el instanceof HTMLElement) {
        return queryForTemplates(el)
      }
    })
    .filter(v => !!v)
    .flat()
}

function templateHandler(tplArr: HTMLTemplateElement[], fn: (tpl: HTMLTemplateElement) => Promise<void>) {
  return Promise.all(tplArr.map(tpl => fn(tpl)))
}
