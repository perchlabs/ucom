import type {
  WebComponent,
  Plugin,
  PluginParseParams,
  PluginConstructParams,
  QueryableRoot,
  ComponentIdentity,
  ComponentManager,
  ComponentDef,
} from './reference.ts'
import {
  isString,
  isElement,
  ArrayFrom,
  ObjectFromEntries,
  safeNodeName,
  isValidComponentName,
  queryAll,
  attrToggled,
  attributeEntries,
  observeMutations,
} from './common.ts'

export default {
  async parse({man, frag}: PluginParseParams) {
    await importTopLevelElements(man, ArrayFrom(frag.children))
  },

  construct({man, el, root}: PluginConstructParams): void {
    const processUndefinedElements = async (undefArr: Element[]) =>
      undefArr.forEach(el => {
        const item = man.lazy[safeNodeName(el)]
        if (item) {
          man.get(item.path)
        }
      })

    const queryForUndefined = (root: QueryableRoot) => {
      const arr = queryAll(root, ':not(:defined)')
      const nodeName = safeNodeName(root)
      if (isValidComponentName(nodeName) && !man.has(nodeName)) {
        arr.push(root as Element)
      }
      return arr
    }

    ;(el as UpgradeComponent).$import = async (ref: unknown) => {
      if (isString(ref)) {
        return man.get(ref)
      }
      if (ref instanceof HTMLSlotElement) {
        const dataArr = importTopLevelElements(
          man,
          (ref as HTMLSlotElement).assignedElements?.() ?? ref.children
        )
        processUndefinedElements(queryForUndefined(root))
        return dataArr
      }
    }

    observeMutations(root, muts =>
      processUndefinedElements(
        [...muts].
        flatMap(v => [...v.addedNodes]).
        filter(isElement).
        flatMap(el => queryForUndefined(el))
      )
    )
  },
} as Plugin

const importTopLevelElements = async (man: ComponentManager, elArr: Element[]): Promise<ImportComponentData[]> => {
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
              man.get(path)
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
  attributes: Record<string, string | null>,
  ident: ComponentIdentity,
}

interface UpgradeComponent extends WebComponent {
  $import(ref: unknown): Promise<ImportComponentData[] | ComponentDef | undefined | void>
}
