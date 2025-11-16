import type {
  Plugin,
  PluginDefineParams,
  PluginConstructParams,
} from '../ucom'

const PROTO_SKIP = new Set('constructor')

export default class implements Plugin {
  async define({Raw, exports}: PluginDefineParams): Promise<void> {
    const rawProto = Raw.prototype
    for (const k in exports) {
      if (k in PROTO_SKIP) { continue }
      if (k in rawProto) { continue }
      if (k.startsWith('$')) { continue }
      rawProto[k] = exports[k]
    }
  }

  construct({el, shadow}: PluginConstructParams): void {
    const $querySelector = (v: string) => shadow.querySelector(v)
    const $querySelectorAll = (v: string) => shadow.querySelectorAll(v)

    Object.assign(el, {
      $querySelector,
      $querySelectorAll,
      $qs: $querySelector,
      $qsa: $querySelectorAll,
    })
  }
}
