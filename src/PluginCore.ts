import type {
  Plugin,
  PluginDefineParams,
  PluginConstructParams,
} from './types.ts'
import {
  isSystemKey,
} from './common.ts'

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
    Object.assign(el, {
      $: (v: string) => shadow.querySelector(v),
      $$: (v: string) => shadow.querySelectorAll(v),
    })
  }
}
