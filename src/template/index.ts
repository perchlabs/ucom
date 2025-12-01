import type { ProxyStore } from './types.ts'
import { createContext } from './context.ts'
import { walkChildren } from './walk.ts'

export * from './types.js'
export * from './signal.js'
export { makeProxyRef, createProxyStore, createProxyRefs, cleanup } from './context.ts'

export function initRoot(root: ShadowRoot, proxyStore: ProxyStore) {
  const ctx = createContext(root, proxyStore)
  walkChildren(ctx, root)
  return ctx
}
