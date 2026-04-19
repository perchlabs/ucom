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

// const ATTR_SRC = 'u-src'

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

const getMutationUndefined = (man: ComponentManager, muts: MutationRecord[]) => {
  const elements = [...muts]
    .map(v => [...v.addedNodes])
    .flat()
    .filter(el => el.nodeType === 1) as Element[]

  return elements
    .map(el => queryForUndefined(man, el))
    .flat()
}

const queryForUndefined = (man: ComponentManager, root: QueryableRoot) => {
  const arr = queryAll(root, ':not(:defined)')
  if ('tagName' in root && man.isName(root.tagName, true) && !man.has(root.tagName)) {
    arr.push(root)
  }
  return arr
}

async function importElements(man: ComponentManager, elArr: Element[]): Promise<ImportComponentData[]> {
  let base: ImportBase = ['', false]

  return elArr.map(el => {
    if (el instanceof HTMLBaseElement) {
      el.remove()
      base = [
        el.getAttribute('href') ?? '',
        attrToggled(el, 'lazy'),
      ]
    } else if (el instanceof HTMLSourceElement) {
      return handleSourceElement(man, el, base)
    }
  })
  .filter(v => !!v)
}

function handleSourceElement(man: ComponentManager, el: HTMLSourceElement, [urlPrefix, lazy]: ImportBase): ImportComponentData | undefined {
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
  } else {
    console.error("SOURCE must have a 'src'")
  }
}

type ImportComponentData = {
  attributes: Record<string, string>,
  ident: ComponentIdentity,
}

type ImportBase = [
  urlPrefix: string,
  lazy: boolean,
]

interface UpgradeComponent extends WebComponent {
  $import: ComponentImporter,
  $importSlot: (ref: unknown) => Promise<ImportComponentData[]>
}
