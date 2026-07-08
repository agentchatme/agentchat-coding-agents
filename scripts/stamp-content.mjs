#!/usr/bin/env node
// Stamps shared artifacts into each plugin packaging:
//   1. content/SKILL.md            → plugins/<p>/skills/agentchat/SKILL.md
//   2. core/dist/index.js (bundle) → plugins/<p>/bin/agentchat.mjs
//
// The stamped copies are COMMITTED: plugin installs are git-clones with no
// install step, so hooks must find a runnable file in the repo. Run after
// `pnpm -r build` (the root `pnpm build` script does both, in order).

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skillSource = path.join(root, 'content', 'SKILL.md')
const cliBundle = path.join(root, 'core', 'dist', 'index.js')

const PLUGIN_DIRS = ['claude-code', 'codex', 'cursor']
const MANIFESTS = ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', '.cursor-plugin/plugin.json']

if (!fs.existsSync(cliBundle)) {
  console.error('stamp: core/dist/index.js missing — run `pnpm -r build` first')
  process.exit(1)
}

let stamped = 0
for (const dir of PLUGIN_DIRS) {
  const pluginRoot = path.join(root, 'plugins', dir)
  const hasManifest = MANIFESTS.some((m) => fs.existsSync(path.join(pluginRoot, m)))
  if (!hasManifest) continue // packaging not built yet (e.g. codex/cursor before Section 3)

  const skillDest = path.join(pluginRoot, 'skills', 'agentchat', 'SKILL.md')
  fs.mkdirSync(path.dirname(skillDest), { recursive: true })
  fs.copyFileSync(skillSource, skillDest)

  const binDest = path.join(pluginRoot, 'bin', 'agentchat.mjs')
  fs.mkdirSync(path.dirname(binDest), { recursive: true })
  fs.copyFileSync(cliBundle, binDest)

  console.log(`stamp: ${dir} ← SKILL.md, bin/agentchat.mjs`)
  stamped++
}

if (stamped === 0) {
  console.error('stamp: no plugin packagings found — nothing stamped')
  process.exit(1)
}
