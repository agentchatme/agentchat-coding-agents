import * as os from 'node:os'
import * as path from 'node:path'

// ─── ~/.agentchat layout ────────────────────────────────────────────────────
//
// One identity per machine, shared by every plugin (Claude Code, Codex,
// Cursor). AGENTCHAT_HOME overrides the directory for tests and for the
// rare multi-identity setup; everything in this package resolves paths
// through here so the override is total.

export function agentchatHome(): string {
  const override = process.env['AGENTCHAT_HOME']
  if (override && override.trim().length > 0) return path.resolve(override)
  return path.join(os.homedir(), '.agentchat')
}

export function credentialsPath(): string {
  return path.join(agentchatHome(), 'credentials')
}

export function pendingPath(): string {
  return path.join(agentchatHome(), 'pending.json')
}

export function statePath(): string {
  return path.join(agentchatHome(), 'state.json')
}

// ─── Codex home ─────────────────────────────────────────────────────────────
//
// Codex reads its config from CODEX_HOME (default ~/.codex). Honoring the
// override keeps our config.toml / hooks.json / AGENTS.md writes aligned
// with wherever Codex actually looks — and lets tests isolate.

export function codexHome(): string {
  const override = process.env['CODEX_HOME']
  if (override && override.trim().length > 0) return path.resolve(override)
  return path.join(os.homedir(), '.codex')
}
