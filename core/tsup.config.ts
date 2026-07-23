import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },
  // Self-contained single file: the plugin packagings ship a copy of THIS
  // ONE file (scripts/stamp-content.mjs copies core/dist/index.js →
  // platforms/<p>/bin/agentchat) and invoke it from hooks with plain `node`,
  // no node_modules present. Everything must be inlined into index.js.
  //   * noExternal — inline the runtime deps rather than leave bare imports.
  //   * splitting:false — MUST stay off. ESM splitting (which a transitive
  //     esbuild bump silently switched on 2026-07-23) emits chunk-*.js /
  //     wrapper-*.js siblings that index.js imports; the stamp copies only
  //     index.js, so the shipped bin would fail on a missing chunk. Keeping
  //     it a single file is a hard requirement of the git-clone install model.
  noExternal: ['agentchatme', 'zod'],
  splitting: false,
})
