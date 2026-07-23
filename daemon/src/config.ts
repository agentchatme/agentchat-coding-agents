import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { z } from 'zod'

// ─── Identity resolution ────────────────────────────────────────────────────
//
// The daemon runs AS one host agent (same identity the in-session plugin uses)
// — never a separate account. It reads that agent's credential from the same
// host-scoped home the coding-agents CLI writes:
//   codex        → ~/.codex/agentchat
//   claude-code  → ~/.claude/agentchat
// resolved explicitly by --home or --platform (or AGENTCHAT_HOME).

const DEFAULT_API_BASE = 'https://api.agentchat.me'

const CredentialsSchema = z.object({
  api_key: z.string().min(20),
  handle: z.string().min(3),
  api_base: z.string().url().optional(),
})

export type Runtime = 'codex' | 'claude-code'

export interface DaemonConfig {
  apiKey: string
  handle: string
  apiBase: string
  wsUrl: string
  runtime: Runtime
  home: string
  /** CODEX_HOME / CLAUDE config the adapter drives (defaults per runtime). */
  runtimeHome: string
  workdir: string
}

function hostHome(runtime: Runtime): string {
  return runtime === 'codex'
    ? path.join(process.env['CODEX_HOME'] ?? path.join(os.homedir(), '.codex'), 'agentchat')
    : path.join(os.homedir(), '.claude', 'agentchat')
}

export interface ResolveOpts {
  home?: string
  runtime?: Runtime
  workdir?: string
}

export function resolveConfig(opts: ResolveOpts): DaemonConfig {
  const runtime: Runtime = opts.runtime ?? 'codex'
  const home =
    opts.home ??
    (process.env['AGENTCHAT_HOME']?.trim() ? path.resolve(process.env['AGENTCHAT_HOME']!) : hostHome(runtime))

  const raw = fs.readFileSync(path.join(home, 'credentials'), 'utf-8')
  const creds = CredentialsSchema.parse(JSON.parse(raw))
  const apiBase = creds.api_base ?? DEFAULT_API_BASE
  const wsUrl = apiBase.replace(/^http/, 'ws').replace(/\/+$/, '') + '/v1/ws'

  const runtimeHome =
    runtime === 'codex'
      ? (process.env['CODEX_HOME'] ?? path.join(os.homedir(), '.codex'))
      : (process.env['CLAUDE_CONFIG_DIR'] ?? path.join(os.homedir(), '.claude'))

  return {
    apiKey: creds.api_key,
    handle: creds.handle,
    apiBase,
    wsUrl,
    runtime,
    home,
    runtimeHome,
    workdir: opts.workdir ?? path.join(home, 'daemon-workdir'),
  }
}
