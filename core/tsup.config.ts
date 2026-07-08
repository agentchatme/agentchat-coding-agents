import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },
  // Self-contained single file: the plugin packagings ship a copy of this
  // bundle and invoke it from hooks with plain `node`, with no node_modules
  // present. Everything must be inlined.
  noExternal: ['agentchatme', 'zod'],
})
