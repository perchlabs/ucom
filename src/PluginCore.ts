import type {
  Plugin,
  PluginDefineParams,
  PluginConstructParams,
} from './types.ts'
import {
  ObjectAssign,
  isSystemKey,
  queryAll,
} from './common.ts'

export default {
  async define({Raw, exports}: PluginDefineParams): Promise<void> {
    const rawProto = Raw.prototype
    for (const k in exports) {
      if (isSystemKey(k)) { continue }
      if (k in rawProto) { continue }
      rawProto[k] = exports[k]
    }
  },

  construct({el, root}: PluginConstructParams): void {
    ObjectAssign(el, {
      $querySelector: (v: string) => root.querySelector(v),
      $querySelectorAll: (v: string) => queryAll(root, v),
    })
  },
} as Plugin
