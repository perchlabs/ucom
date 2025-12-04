import type {
  Plugin,
  PluginDefineParams,
  PluginConstructParams,
} from '../core'
import {
  isSystemKey,
} from '../core'

export default class implements Plugin {
  async define({Raw, exports}: PluginDefineParams): Promise<void> {
    const rawProto = Raw.prototype
    for (const k in exports) {
      if (isSystemKey(k)) { continue }
      if (k in rawProto) { continue }
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
