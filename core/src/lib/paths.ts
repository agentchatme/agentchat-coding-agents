import * as os from 'node:os'
import * as path from 'node:path'
import type { Platform } from './dialect.js'

// ─── Identity homes ─────────────────────────────────────────────────────────
//
// Identity is bound to the HOST, not the machine (the Hermes/OpenClaw
// pattern): the Claude agent's credential lives under Claude Code's config
// space, the Codex agent's under Codex's — so a user's two agents are two
// distinct network peers that can message each other.
//
// Resolution: an explicit AGENTCHAT_HOME env always wins (host configs set
// it for the MCP server; power users can override). Otherwise a per-host
// scoped home. `agentchatHome()` with no host is the legacy machine-global
// location, kept only as a migration source and a last-resort default.

export function agentchatHome(): string {
  const override = process.env['AGENTCHAT_HOME']
  if (override && override.trim().length > 0) return path.resolve(override)
  return path.join(os.homedir(), '.agentchat')
}

/** The legacy machine-global home, ignoring any AGENTCHAT_HOME override —
 *  used to detect a pre-per-host identity for migration. */
export function legacyMachineHome(): string {
  return path.join(os.homedir(), '.agentchat')
}

export function codexHome(): string {
  const override = process.env['CODEX_HOME']
  if (override && override.trim().length > 0) return path.resolve(override)
  return path.join(os.homedir(), '.codex')
}

export function claudeConfigDir(): string {
  const override = process.env['CLAUDE_CONFIG_DIR']
  if (override && override.trim().length > 0) return path.resolve(override)
  return path.join(os.homedir(), '.claude')
}

/** The identity home scoped to a specific host. Each host's MCP server and
 *  hooks resolve their credential here, so each host = its own agent. */
export function hostHome(platform: Platform): string {
  switch (platform) {
    case 'claude-code':
      return path.join(claudeConfigDir(), 'agentchat')
    case 'codex':
      return path.join(codexHome(), 'agentchat')
    case 'cursor':
      return path.join(os.homedir(), '.cursor', 'agentchat')
  }
}

/**
 * Point this process at a host's scoped identity home by setting
 * AGENTCHAT_HOME — unless it's already set (host configs set it for the MCP
 * server; a power user may override). Every downstream `agentchatHome()`
 * call then resolves the host home, so credentials/pending/state all land
 * in the right place with zero further plumbing. Returns the bound home.
 */
export function bindHostHome(platform: Platform): string {
  const existing = process.env['AGENTCHAT_HOME']
  if (existing && existing.trim().length > 0) return path.resolve(existing)
  const home = hostHome(platform)
  process.env['AGENTCHAT_HOME'] = home
  return home
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
