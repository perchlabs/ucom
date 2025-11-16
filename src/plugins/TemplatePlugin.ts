import type {
  Plugin,
  PluginStartParams,
  PluginParseParams,
  QueryableRoot,
  ComponentManager,
} from '../ucom'
import {
  ATTR_CORE,
} from '../ucom'

const ATTR_APP = 'u-app'
const ATTR_COM = ATTR_CORE
const ATTR_LIST = [ATTR_APP, ATTR_COM]

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
    if (tpl.hasAttribute(ATTR_APP)) {
      const ident = await man.define(null, tpl)
      if (ident) {
        tpl.replaceWith(document.createElement(ident.name))
      }
    } else if (tpl.hasAttribute(ATTR_COM)) {
      tpl.remove()
      const ref = tpl.getAttribute(ATTR_COM) ?? ''
      ref.includes('/')
        ? await man.import(ref, tpl)
        : await man.define(ref, tpl)
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
  const sel = ATTR_LIST.map(v => `template[${v}]`).join(',')
  return [...root.querySelectorAll(sel)]
    .filter(v => v instanceof HTMLTemplateElement)
}

function getMutationTemplates(muts: MutationRecord[]) {
  const has = (el: Element) => el.hasAttribute(ATTR_APP) || el.hasAttribute(ATTR_COM)

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
