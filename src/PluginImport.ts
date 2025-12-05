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
  $attrBool,
  isValidName,
} from './common.ts'

// const ATTR_SRC = 'u-src'

export default class implements Plugin {
  async parse({man, frags}: PluginParseParams) {
    await importElements(man, Array.from(frags.children))
  }

  async define({man, Com}: PluginDefineParams) {
    Object.assign(Com.prototype, {
      $import: man.import
    })
  }

  construct({man, el, shadow}: PluginConstructParams): void {
    (el as UpgradeComponent).$importSlot = async (ref: unknown): Promise<ImportComponentData[]> => {
      if (!(ref instanceof HTMLSlotElement)) {
        throw 'Invalid arugment.  Must be an HTML Element.'
      }

      const dataArr = importElements(man, ref.assignedElements())
      processUndefinedElements(man, queryForUndefined(man, shadow))
      return dataArr
    }

    // processUndefinedElements(man, queryForUndefined(man, shadow))
    observeMutations(man, shadow)
  }
}

async function processUndefinedElements(man: ComponentManager, undefArr: Element[]) {
  undefArr.forEach(el => {
    const item = man.lazy[el.tagName.toLowerCase()]
    if (item) {
      man.import(item.resolved)
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
  const arr = Array.from(root.querySelectorAll(':not(:defined)')) as Element[]

  if ('tagName' in root && isValidName(root.tagName.toLowerCase()) && !man.registered(root.tagName)) {
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
        $attrBool(el, 'lazy'),
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
  if (!src) {
    console.error("SOURCE element needs a 'src' attribute")
    return
  }

  const attributes: Record<string, any> = {}
  for (const {name, value} of el.attributes) {
    attributes[name] = value
  }

  const ident = man.resolve(urlPrefix + src)
  const {name, resolved} = ident

  if (!man.registered(name)) {
    if (lazy || $attrBool(el, 'lazy')) {
      man.lazy[name] = ident
    } else {
      man.import(resolved)
    }
  }

  return {
    attributes,
    ident,
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
