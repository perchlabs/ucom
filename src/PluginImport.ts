import type {
  WebComponent,
  Plugin,
  PluginParseParams,
  PluginConstructParams,
  QueryableRoot,
  ComponentIdentity,
  ComponentManager,
  ComponentDef,
} from './types.ts'
import {
  isString,
  isElement,
  ArrayFrom,
  ObjectFromEntries,
  safeNodeName,
  queryAll,
  attrToggled,
  attributeEntries,
} from './common.ts'

export default {
  async parse({man, frag}: PluginParseParams) {
    await importTopLevelElements(man, ArrayFrom(frag.children))
  },

  construct({man, el, root}: PluginConstructParams): void {
    (el as UpgradeComponent).$import = async (ref: unknown) => {
      if (isString(ref)) {
        return man.import(ref)
      }
      if (ref instanceof HTMLElement) {
        const dataArr = importTopLevelElements(man,
          (ref as HTMLSlotElement).assignedElements?.() ?? ref.children
        )
        processUndefinedElements(man, queryForUndefined(man, root))
        return dataArr
      }
    }

    observeMutations(man, root)
  },
} as Plugin

async function processUndefinedElements(man: ComponentManager, undefArr: Element[]) {
  undefArr.forEach(el => {
    const item = man.lazy[safeNodeName(el)]
    if (item) {
      man.import(item.path)
    }
  })
}

const observeMutations = (
  man: ComponentManager,
  root: QueryableRoot,
) => new MutationObserver(muts => {
  processUndefinedElements(man, getMutationUndefined(man, muts))
}).observe(root, {
  childList: true,
  subtree: true,
})

const getMutationUndefined = (man: ComponentManager, muts: MutationRecord[]) =>
  [...muts].
  flatMap(v => [...v.addedNodes]).
  filter(isElement).
  flatMap(el => queryForUndefined(man, el as Element))

const queryForUndefined = (man: ComponentManager, root: QueryableRoot) => {
  const arr = queryAll(root, ':not(:defined)')
  const nodeName = safeNodeName(root)
  if (man.isName(nodeName) && !man.has(nodeName)) {
    arr.push(root as Element)
  }
  return arr
}

async function importTopLevelElements(man: ComponentManager, elArr: Element[]): Promise<ImportComponentData[]> {
  let urlPrefix = ''
  let lazy = false

  return elArr.flatMap(el => {
    switch (safeNodeName(el)) {
      case 'base':
        el.remove()
        urlPrefix = el.getAttribute('href') ?? ''
        lazy = attrToggled(el, 'lazy')
        break
      case 'source':
        el.remove()
        const src = el.getAttribute('src')
        if (src) {
          const ident = man.resolve(urlPrefix + src)
          const {name, path} = ident

          if (!man.has(name)) {
            if (lazy || attrToggled(el, 'lazy')) {
              man.lazy[name] = ident
            } else {
              man.import(path)
            }
          }

          return {
            ident,
            attributes: ObjectFromEntries(attributeEntries(el))
          }
        }
    }

    return []
  })
}

type ImportComponentData = {
  attributes: Record<string, string>,
  ident: ComponentIdentity,
}

interface UpgradeComponent extends WebComponent {
  $import(ref: unknown): Promise<ImportComponentData[] | ComponentDef | undefined | void>
}
