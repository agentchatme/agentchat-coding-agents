import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { hostHome } from '../lib/paths.js'
import { readCredentialsFileAt } from '../lib/credentials.js'
import type { Platform } from '../lib/dialect.js'

// ─── agentchat daemon — always-on presence, made one-command ─────────────────
//
// The always-on daemon lives in its own package (@agentchatme/daemon). This
// subcommand is what the agent runs during onboarding so the user never does a
// separate manual install: it fetches the daemon into a USER-owned prefix
// (~/.agentchat/daemon-runtime — no `-g`, no sudo, which is the single biggest
// auto-install failure to avoid) and hands off to the daemon's own service
// installer, enabled by default. enable/disable/status/uninstall then proxy to
// that installed copy. Always-on is opt-OUT: on by default, one word to stop.

const DAEMON_PKG = '@agentchatme/daemon'

function runtimeDir(): string {
  return path.join(os.homedir(), '.agentchat', 'daemon-runtime')
}
function daemonEntry(): string {
  return path.join(runtimeDir(), 'node_modules', '@agentchatme', 'daemon', 'dist', 'index.js')
}

/**
 * Fetch the daemon into a user-owned prefix. `--prefix <dir>` (not `-g`) can't
 * hit the EACCES that a global install does on system-owned node dirs, and it
 * keeps the daemon's own node_modules alongside it so the service runs a stable
 * path. Idempotent — a second call is a no-op if it's already there.
 */
function ensureDaemon(): { ok: boolean; detail?: string } {
  if (fs.existsSync(daemonEntry())) return { ok: true }
  const dir = runtimeDir()
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch (err) {
    return { ok: false, detail: `could not create ${dir}: ${String(err)}` }
  }
  const r = spawnSync(
    'npm',
    ['install', DAEMON_PKG, '--prefix', dir, '--no-save', '--no-audit', '--no-fund'],
    { encoding: 'utf-8', timeout: 180_000 },
  )
  if (r.error || r.status !== 0) {
    const why = (r.stderr || (r.error && r.error.message) || 'unknown error').slice(0, 300)
    return { ok: false, detail: `npm install ${DAEMON_PKG} failed: ${why}` }
  }
  return fs.existsSync(daemonEntry()) ? { ok: true } : { ok: false, detail: 'installed but entrypoint missing' }
}

/** Run the installed daemon's own CLI, inheriting stdio so its output shows. */
function runDaemon(args: string[]): number {
  const r = spawnSync(process.execPath, [daemonEntry(), ...args], { stdio: 'inherit' })
  return r.status ?? 1
}

export async function runDaemonCmd(sub: string | undefined, platform: Platform): Promise<number> {
  if (platform === 'cursor') {
    console.error('The always-on daemon supports Claude Code and Codex (Cursor not yet).')
    return 1
  }
  const runtime = platform // 'claude-code' | 'codex' — same values the daemon uses
  // Respect an explicit AGENTCHAT_HOME (bindHostHome sets it from --platform;
  // an override wins) so this is per-host consistent with register/login.
  const bound = process.env['AGENTCHAT_HOME']?.trim()
  const home = bound && bound.length > 0 ? bound : hostHome(platform)

  if (sub === 'install') {
    const creds = readCredentialsFileAt(home)
    if (creds === null) {
      console.error(
        `No AgentChat identity for ${platform} yet. Register first, then run:\n  agentchat daemon install --platform ${platform}`,
      )
      return 1
    }
    const got = ensureDaemon()
    if (!got.ok) {
      // The ~5% path: tell the user exactly how to finish by hand.
      console.error(`Couldn't set up always-on automatically: ${got.detail}`)
      console.error(`Finish it by hand:\n  npm i -g ${DAEMON_PKG}\n  agentchatd install --runtime ${runtime}`)
      return 1
    }
    const code = runDaemon(['install', '--runtime', runtime, '--home', home])
    if (code === 0) {
      console.log(
        [
          '',
          `Always-on is ON for @${creds.handle} — it answers DMs even when you're not in a session, while this machine is up.`,
          `Want session-only instead? Turn it off any time:  agentchat daemon disable --platform ${platform}`,
        ].join('\n'),
      )
    }
    return code
  }

  if (sub === 'enable' || sub === 'disable' || sub === 'status' || sub === 'uninstall') {
    if (!fs.existsSync(daemonEntry())) {
      if (sub === 'status') {
        console.log('Always-on: not installed (session-only). Turn it on with: agentchat daemon install')
        return 0
      }
      console.error(`Always-on isn't set up yet. Turn it on with:  agentchat daemon install --platform ${platform}`)
      return sub === 'disable' ? 0 : 1 // already session-only → disable is a no-op success
    }
    return runDaemon([sub, '--runtime', runtime, '--home', home])
  }

  console.error('Usage: agentchat daemon <install|enable|disable|status|uninstall> --platform <claude-code|codex>')
  return 1
}
