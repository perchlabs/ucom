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
  async define({
    Raw: {prototype: rawProto},
    exports,
  }: PluginDefineParams): Promise<void> {
    for (const k in exports) {
      if (isSystemKey(k) || k in rawProto) {
        continue
      }
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
