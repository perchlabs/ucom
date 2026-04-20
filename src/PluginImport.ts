import type {
  WebComponent,
  Plugin,
  PluginParseParams,
  PluginDefineParams,
  PluginConstructParams,
  QueryableRoot,
  ComponentIdentity,
  ComponentManager,
  ComponentImporter,
} from './types.ts'
import {
  ArrayFrom,
  ObjectAssign,
  ObjectFromEntries,
  queryAll,
  attrToggled,
  attributeEntries,
} from './common.ts'

export default {
  async parse({man, frag}: PluginParseParams) {
    await importElements(man, ArrayFrom(frag.children))
  },

  async define({man, Com}: PluginDefineParams) {
    ObjectAssign(Com.prototype, {
      $import: man.import
    })
  },

  construct({man, el, root}: PluginConstructParams): void {
    (el as UpgradeComponent).$importSlot = async (ref: unknown): Promise<ImportComponentData[]> => {
      if (!(ref instanceof HTMLSlotElement)) {
        throw 'Import must be an HTMLSlotElement.'
      }

      const dataArr = importElements(man, ref.assignedElements())
      processUndefinedElements(man, queryForUndefined(man, root))
      return dataArr
    }

    // processUndefinedElements(man, queryForUndefined(man, root))
    observeMutations(man, root)
  },
} as Plugin

async function processUndefinedElements(man: ComponentManager, undefArr: Element[]) {
  undefArr.forEach(el => {
    const item = man.lazy[el.tagName.toLowerCase()]
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
  filter(el => el.nodeType === 1).
  flatMap(el => queryForUndefined(man, el as Element))

const queryForUndefined = (man: ComponentManager, root: QueryableRoot) => {
  const arr = queryAll(root, ':not(:defined)')
  if ('tagName' in root && man.isName(root.tagName, true) && !man.has(root.tagName)) {
    arr.push(root)
  }
  return arr
}

async function importElements(man: ComponentManager, elArr: Element[]): Promise<ImportComponentData[]> {
  let urlPrefix = ''
  let lazy = false

  return elArr.map(el => {
    if (el instanceof HTMLBaseElement) {
      el.remove()
      urlPrefix = el.getAttribute('href') ?? ''
      lazy = attrToggled(el, 'lazy')
    } else if (el instanceof HTMLSourceElement) {
      el.remove()

      const src = el.getAttribute('src')
      if (src) {
        const ident = man.resolve(urlPrefix + src)
        const {name, path: resolved} = ident

        if (!man.has(name)) {
          if (lazy || attrToggled(el, 'lazy')) {
            man.lazy[name] = ident
          } else {
            man.import(resolved)
          }
        }

        return {
          ident,
          attributes: ObjectFromEntries(attributeEntries(el))
        }
      }
    }
  })
  .filter(v => !!v)
}

type ImportComponentData = {
  attributes: Record<string, string>,
  ident: ComponentIdentity,
}

interface UpgradeComponent extends WebComponent {
  $import: ComponentImporter,
  $importSlot: (ref: unknown) => Promise<ImportComponentData[]>
}
