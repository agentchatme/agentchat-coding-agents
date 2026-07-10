#!/usr/bin/env node
// Stamps shared artifacts into each plugin packaging:
//   1. content/SKILL.md            → platforms/<p>/skills/agentchat/SKILL.md
//   2. core/dist/index.js (bundle) → platforms/<p>/bin/agentchat
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
  const pluginRoot = path.join(root, 'platforms', dir)
  const hasManifest = MANIFESTS.some((m) => fs.existsSync(path.join(pluginRoot, m)))
  if (!hasManifest) continue // packaging not built yet (e.g. codex/cursor before Section 3)

  const skillDest = path.join(pluginRoot, 'skills', 'agentchat', 'SKILL.md')
  fs.mkdirSync(path.dirname(skillDest), { recursive: true })
  fs.copyFileSync(skillSource, skillDest)

  // Extensionless + executable so that a PATH exposure of the plugin's bin/
  // gives users the literal `agentchat` command every piece of copy names.
  // (Hooks invoke it via `node` + absolute path either way.)
  const binDest = path.join(pluginRoot, 'bin', 'agentchat')
  fs.mkdirSync(path.dirname(binDest), { recursive: true })
  fs.copyFileSync(cliBundle, binDest)
  fs.chmodSync(binDest, 0o755)
  const legacyBin = path.join(pluginRoot, 'bin', 'agentchat.mjs')
  if (fs.existsSync(legacyBin)) fs.unlinkSync(legacyBin)

  console.log(`stamp: ${dir} ← SKILL.md, bin/agentchat`)
  stamped++
}

if (stamped === 0) {
  console.error('stamp: no plugin packagings found — nothing stamped')
  process.exit(1)
}
