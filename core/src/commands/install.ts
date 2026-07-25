import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { readCredentialsFileAt } from '../lib/credentials.js'
import { hostHome } from '../lib/paths.js'
import { installCodex, codexIdentityHome } from '../lib/codex-config.js'
import { isPlatform, type Platform } from '../lib/dialect.js'
import { cliName, frontDoorFor, viaFrontDoor } from '../lib/branding.js'

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

const CURSOR_SOON =
  '  Cursor: detected — the AgentChat Cursor packaging ships in the next release; this installer will wire it then.'

export interface InstallDeps {
  /** Injectable for tests: run a platform CLI, return exit code (null = spawn failure). */
  run?: (cmd: string, args: string[]) => number | null
  env?: NodeJS.ProcessEnv
  homedir?: string
  /** The one host to wire (`--platform`). Required when several are installed. */
  platform?: string
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

export type HostChoice =
  | { ok: true; platform: Platform }
  | { ok: false; candidates: Platform[] }

/**
 * Which host a single-agent command (register/login/recover/daemon/anchor/
 * logout) acts on. This is what lets `--platform` disappear from the everyday
 * flow while still refusing to GUESS.
 *
 *   explicit flag → that host (always wins)
 *   exactly one agent installed → that one
 *   none installed → Claude Code (scopes to ~/.claude/agentchat, where the
 *                    wired MCP server reads; nothing else could be meant)
 *   several installed → AMBIGUOUS, and the caller must ask
 *
 * The last case used to silently pick Claude Code. On a machine with both, a
 * Codex user running a bare `agentchat register` would then be handed a Claude
 * Code identity — writing the credential into the wrong host's home and
 * leaving Codex unregistered. Each host is a separate agent with a separate
 * account, so guessing between them is guessing at WHICH ACCOUNT to mutate.
 * Cursor is excluded — it has no identity or daemon support yet.
 */
export function resolveHost(
  explicit: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): HostChoice {
  if (explicit !== undefined && isPlatform(explicit)) return { ok: true, platform: explicit }
  const detected = detectPlatforms(env, home)
    .map((p) => p.key)
    .filter((k): k is Exclude<PlatformProbe['key'], 'cursor'> => k !== 'cursor')
  if (detected.length === 1) return { ok: true, platform: detected[0]! }
  if (detected.length === 0) return { ok: true, platform: 'claude-code' }
  return { ok: false, candidates: detected }
}

/** The message shown when several agents are installed and none was named.
 *  Lists the exact command per host so the next step is copy-paste, never a
 *  guess — and nothing is mutated in the meantime. */
export function ambiguousHostMessage(command: string, candidates: Platform[], extraArgs = ''): string {
  return [
    `More than one coding agent is installed here (${candidates.map(platformLabel).join(', ')}).`,
    'Each one is a separate AgentChat agent with its own account, so name the one you mean:',
    ...candidates.map((c) => `  agentchat ${command}${extraArgs} --platform ${c}`),
  ].join('\n')
}

/** Human label for a platform key (for transparent "…for Claude Code" copy). */
export function platformLabel(key: Platform): string {
  return PROBES.find((p) => p.key === key)?.label ?? key
}

export async function runInstall(deps: InstallDeps = {}): Promise<number> {
  const run = deps.run ?? defaultRun
  const env = deps.env ?? process.env
  const home = deps.homedir ?? os.homedir()

  const found = detectPlatforms(env, home)
  if (found.length === 0) {
    console.log(
      [
        'No supported coding agent found on this machine (looked for Claude Code, Codex, Cursor).',
        'Install one of them first, then re-run: agentchat install',
      ].join('\n'),
    )
    return 1
  }

  // Wire EXACTLY ONE agent. Wiring every agent found was the old behavior and
  // it was wrong: a user setting up Codex would silently have their Claude
  // Code rewired too (new plugin, new hooks, new MCP server), with no warning
  // and no way to tell which agent the following registration belonged to.
  // Installing for one agent must leave every other agent untouched.
  const explicit = deps.platform
  if (explicit !== undefined && !isPlatform(explicit)) {
    console.error(`Unknown --platform "${explicit}" (expected claude-code, codex, or cursor).`)
    return 1
  }
  if (explicit === 'cursor') {
    console.log(CURSOR_SOON)
    return 0
  }
  // Cursor can't be a target yet, so it never makes the choice ambiguous.
  const installable = found.filter((p) => p.key !== 'cursor')
  if (installable.length === 0) {
    console.log(CURSOR_SOON)
    return 0
  }
  let target: PlatformProbe
  if (explicit !== undefined) {
    const match = installable.find((p) => p.key === explicit)
    if (match === undefined) {
      console.error(
        `${platformLabel(explicit)} was not found on this machine (found: ${found.map((f) => f.label).join(', ')}).`,
      )
      return 1
    }
    target = match
  } else if (installable.length === 1) {
    target = installable[0]!
  } else {
    console.error(
      ambiguousHostMessage(
        'install',
        installable.map((f) => f.key),
      ),
    )
    return 1
  }

  console.log(`Setting up ${target.label}.`)
  let failures = 0

  {
    const platform = target
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
        console.log(CURSOR_SOON)
        break
    }
  }

  // Report identity for the host we just set up — and ONLY that host. The
  // other agents on this box are none of this command's business.
  const others = installable.filter((p) => p.key !== target.key)
  // `--platform` is only meaningful once a second agent exists; on a
  // one-agent machine it is pure jargon and auto-detection covers it.
  const platformArg = others.length > 0 ? ` --platform ${target.key}` : ''
  const handle = readCredentialsFileAt(hostHome(target.key))?.handle ?? null
  if (handle !== null) {
    console.log(`\nSigned in: ${target.label} → @${handle}`)
  } else {
    // Phrase the command in whatever the user actually has: someone who came
    // through `npx -y @agentchatme/codex` has no `agentchat` on their PATH.
    const registerCmd = viaFrontDoor()
      ? `${cliName()} register --email <email> --handle <handle>`
      : `agentchat register${platformArg} --email <email> --handle <handle>`
    console.log(
      [
        '',
        `Last step — give ${target.label} its @handle:`,
        `  Open ${target.label} and it will offer to set one up — or run:`,
        `    ${registerCmd}`,
      ].join('\n'),
    )
  }

  // Name the other installed agents without touching them, so a user with two
  // knows the second is a deliberate, separate setup rather than something
  // that silently happened (or silently didn't). Point at that agent's OWN
  // front door — the two flows are separate all the way down.
  if (others.length > 0) {
    console.log(
      [
        '',
        `Also installed here: ${others.map((o) => o.label).join(', ')} — left untouched.`,
        'Each coding agent is its own AgentChat agent with its own @handle, and they can DM each other.',
        ...others.flatMap((o) => [`  Set up ${o.label}:`, ...frontDoorFor(o.key).map((c) => `    ${c}`)]),
      ].join('\n'),
    )
  }
  if (found.some((p) => p.key === 'cursor')) console.log(CURSOR_SOON)

  return failures === 0 ? 0 : 1
}
