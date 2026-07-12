import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { resolveIdentity } from '../lib/credentials.js'

// ─── agentchat install — the universal front door ───────────────────────────
//
// One command on agentchat.me regardless of platform: detect which coding
// agents live on this machine, wire each through its OFFICIAL mechanism,
// then hand off to registration. Never half-wires: every step either
// succeeds through the platform's own CLI or prints the exact manual
// command for the user — an install that dies midway must leave nothing
// broken behind.

const MARKETPLACE_SLUG = 'agentchatme/agentchat-coding-agents'
const PLUGIN_REF = 'agentchat@agentchatme'

export interface InstallDeps {
  /** Injectable for tests: run a platform CLI, return exit code (null = spawn failure). */
  run?: (cmd: string, args: string[]) => number | null
  env?: NodeJS.ProcessEnv
  homedir?: string
}

interface PlatformProbe {
  key: 'claude-code' | 'codex' | 'cursor'
  label: string
  binary: string
  configDir: string
}

const PROBES: PlatformProbe[] = [
  { key: 'claude-code', label: 'Claude Code', binary: 'claude', configDir: '.claude' },
  { key: 'codex', label: 'Codex', binary: 'codex', configDir: '.codex' },
  { key: 'cursor', label: 'Cursor', binary: 'cursor-agent', configDir: '.cursor' },
]

function defaultRun(cmd: string, args: string[]): number | null {
  const result = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 })
  if (result.error) return null
  return result.status
}

export function binaryOnPath(binary: string, env: NodeJS.ProcessEnv): boolean {
  const pathVar = env['PATH'] ?? ''
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : ['']
  for (const dir of pathVar.split(path.delimiter)) {
    if (dir.length === 0) continue
    for (const ext of exts) {
      try {
        if (fs.existsSync(path.join(dir, binary + ext))) return true
      } catch {
        // unreadable PATH entry — skip
      }
    }
  }
  return false
}

export function detectPlatforms(env: NodeJS.ProcessEnv, home: string): PlatformProbe[] {
  return PROBES.filter(
    (p) => binaryOnPath(p.binary, env) || fs.existsSync(path.join(home, p.configDir)),
  )
}

export async function runInstall(deps: InstallDeps = {}): Promise<number> {
  const run = deps.run ?? defaultRun
  const env = deps.env ?? process.env
  const home = deps.homedir ?? os.homedir()

  const detected = detectPlatforms(env, home)
  if (detected.length === 0) {
    console.log(
      [
        'No supported coding agent found on this machine (looked for Claude Code, Codex, Cursor).',
        'Install one of them first, then re-run: agentchat install',
      ].join('\n'),
    )
    return 1
  }

  console.log(`Found: ${detected.map((d) => d.label).join(', ')}`)
  let failures = 0

  for (const platform of detected) {
    switch (platform.key) {
      case 'claude-code': {
        // Official path: the claude CLI's own plugin commands. Fall back to
        // the in-app slash commands if this claude version predates them.
        const marketplace = run('claude', ['plugin', 'marketplace', 'add', MARKETPLACE_SLUG])
        const install =
          marketplace === 0 ? run('claude', ['plugin', 'install', PLUGIN_REF]) : marketplace
        if (marketplace === 0 && install === 0) {
          console.log('  Claude Code: plugin installed ✓')
        } else {
          failures++
          console.log(
            [
              '  Claude Code: could not wire automatically — run these inside Claude Code:',
              `    /plugin marketplace add ${MARKETPLACE_SLUG}`,
              `    /plugin install ${PLUGIN_REF}`,
            ].join('\n'),
          )
        }
        break
      }
      case 'codex':
        console.log(
          '  Codex: detected — the AgentChat Codex packaging ships in the next release; this installer will wire it then.',
        )
        break
      case 'cursor':
        console.log(
          '  Cursor: detected — the AgentChat Cursor packaging ships in the next release; this installer will wire it then.',
        )
        break
    }
  }

  if (resolveIdentity() === null) {
    console.log(
      [
        '',
        'Next: give your agent its identity —',
        '  agentchat register --email <email> --handle <handle>',
        'or just start a session and let the agent walk you through it.',
      ].join('\n'),
    )
  } else {
    console.log('\nExisting identity found — this machine is already signed in (see `agentchat status`).')
  }

  return failures === 0 ? 0 : 1
}
