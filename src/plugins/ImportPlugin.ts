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
} from '../core'
import { $attrBool } from '../core'

// const ATTR_SRC = 'u-src'

export default class implements Plugin {
  async parse({man, frags}: PluginParseParams) {
    await importRoot(man, frags)
  }

  async define({man, Com}: PluginDefineParams) {
    Object.assign(Com.prototype, {
      $import: man.import
    })
  }

  construct({man, el: elReal, shadow}: PluginConstructParams): void {
    const el = elReal as UpgradeComponent

    el.$importRoot = async function(ref: unknown): Promise<ImportComponentData[]> {
      if (!(ref instanceof HTMLElement)) {
        throw 'Invalid arugment.  Must be an HTML Element.'
      }

      const dataArr = importRoot(man, ref)
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

function observeMutations(man: ComponentManager, root: QueryableRoot) {
  new MutationObserver(muts => {
    processUndefinedElements(man, getMutationUndefined(man, muts))
  }).observe(root, {
    childList: true,
    subtree: true,
  })
}

function getMutationUndefined(man: ComponentManager, muts: MutationRecord[]) {
  return [...muts].map(v => [...v.addedNodes])
    .flat()
    .filter(el => el.nodeType === 1)
    .map(el => el instanceof Element ? queryForUndefined(man, el) : undefined)
    .filter(v => !!v)
    .flat()
}

function queryForUndefined(man: ComponentManager, root: QueryableRoot) {
  const arr = [...root.querySelectorAll(':not(:defined)')] as Element[]
  if (!('tagName' in root)) {
    return arr
  }

  const {tagName} = root
  if (tagName.includes('-') && !man.registered(root.tagName)) {
    arr.push(root)
  }

  return arr
}

async function importRoot(man: ComponentManager, root: QueryableRoot): Promise<ImportComponentData[]> {
  const carry: ImportCarry = {
    urlPrefix: '',
    lazy: false,
  }

  const dataArr: ImportComponentData[] = []

  // TODO: Wait for standards to ":scope > " for finding only top-level children of DocumentFragment.
  // for (const el of [...root.querySelectorAll(':scope > base, :scope > source') as NodeListOf<HTMLElement>]) {
  // }

  const elArr = root instanceof HTMLSlotElement ? root.assignedElements() : Array.from(root.children)
  for (const el of elArr) {
    if (el instanceof HTMLBaseElement) {
      handleBaseElement(el, carry)
    } else if (el instanceof HTMLSourceElement) {
      const data = handleSourceElement(el, carry, man)
      if (data) {
        dataArr.push(data)
      }
    }
  }

  return dataArr
}

function handleBaseElement(el: HTMLBaseElement, carry: ImportCarry) {
  el.remove()
  Object.assign(carry, {
    lazy: $attrBool(el, 'lazy'),
    urlPrefix: el.getAttribute('href') ?? '',
  })
}

function handleSourceElement(el: HTMLSourceElement, carry: ImportCarry, man: ComponentManager): ImportComponentData | undefined {
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

  const ident = man.resolve(carry.urlPrefix + src)
  const {name, resolved} = ident

  if (!man.registered(name)) {
    if (carry.lazy || $attrBool(el, 'lazy')) {
      man.lazy[name] = ident
    } else {
      man.import(resolved)
    }
  }

  return {
    attributes,
    ...ident,
  }
}

type ImportComponentData = ComponentIdentity & {
  attributes: Record<string, string>
}

type ImportCarry = {
  urlPrefix: string
  lazy: boolean
}

interface UpgradeComponent extends WebComponent {
  $import: ComponentImporter,
  $importRoot: (ref: unknown) => Promise<ImportComponentData[]>
}
