import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { readCredentialsFileAt } from '../lib/credentials.js'
import { hostHome } from '../lib/paths.js'
import { installCodex, codexIdentityHome } from '../lib/codex-config.js'
import { isPlatform, type Platform } from '../lib/dialect.js'

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

/**
 * Which host a single-agent command (register/login/recover/daemon/anchor) acts
 * on when the user didn't pass --platform. This is what lets `--platform`
 * disappear from the everyday flow: an explicit flag still wins, otherwise we
 * detect the installed agent. Exactly one agent → that one. Several → Claude
 * Code (the flagship), else the first detected. None → Claude Code as a safe
 * default (scopes to ~/.claude/agentchat, where the wired MCP reads). Cursor is
 * excluded — no identity/daemon support yet.
 */
export function autoPlatform(
  explicit: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): Platform {
  if (explicit !== undefined && isPlatform(explicit)) return explicit
  const detected = detectPlatforms(env, home)
    .map((p) => p.key)
    .filter((k) => k !== 'cursor')
  if (detected.length === 1) return detected[0]!
  if (detected.includes('claude-code')) return 'claude-code'
  return detected[0] ?? 'claude-code'
}

/** Human label for a platform key (for transparent "…for Claude Code" copy). */
export function platformLabel(key: Platform): string {
  return PROBES.find((p) => p.key === key)?.label ?? key
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
      case 'codex': {
        // Direct config: Codex has no plugin surface for always-on identity,
        // so we write config.toml (MCP) + hooks.json + AGENTS.md ourselves,
        // merge-safely. `bundleSrc` is this running CLI, copied to a stable
        // path so the hooks don't depend on npx cache.
        const bundleSrc = process.argv[1] ?? ''
        // Resolve the CODEX agent's own handle (its scoped home), not a
        // machine-shared one — each host is a distinct agent now.
        const handle = readCredentialsFileAt(codexIdentityHome())?.handle ?? null
        try {
          const { actions, warnings } = installCodex(bundleSrc, handle)
          console.log(`  Codex: wired ✓ (${actions.join(', ') || 'no changes'})`)
          for (const w of warnings) console.log(`    ⚠ ${w}`)
        } catch (err) {
          failures++
          console.log(`  Codex: wiring failed — ${String(err)}`)
        }
        break
      }
      case 'cursor':
        console.log(
          '  Cursor: detected — the AgentChat Cursor packaging ships in the next release; this installer will wire it then.',
        )
        break
    }
  }

  // Report identity per host — but keep the next step scoped and jargon-free.
  const need: PlatformProbe[] = []
  const have: string[] = []
  for (const platform of detected) {
    if (platform.key === 'cursor') continue
    const handle = readCredentialsFileAt(hostHome(platform.key))?.handle ?? null
    if (handle) have.push(`${platform.label} → @${handle}`)
    else need.push(platform)
  }
  if (have.length > 0) console.log(`\nSigned in: ${have.join(', ')}`)
  if (need.length === 1) {
    // The common case: one agent, one clean instruction, no --platform.
    const label = need[0]!.label
    console.log(
      [
        '',
        `Last step — give ${label} its @handle:`,
        `  Open ${label} and it will offer to set one up — or run:  agentchat register --email <email> --handle <handle>`,
      ].join('\n'),
    )
  } else if (need.length > 1) {
    // Multiple agents: the conversational path handles each with no flag.
    console.log(
      [
        '',
        'Last step — give each agent its @handle (they can then DM each other):',
        '  Open each agent and it will offer to set one up.',
      ].join('\n'),
    )
  }

  return failures === 0 ? 0 : 1
}
