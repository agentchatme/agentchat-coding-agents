import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline/promises'
import { AgentChatClient } from 'agentchatme'
import {
  DEFAULT_API_BASE,
  clearCredentials,
  clearPending,
  readPending,
  readCredentialsFileAt,
  resolveIdentity,
  writeCredentials,
  writePending,
} from '../lib/credentials.js'
import { credentialsPath, hostHome, legacyMachineHome } from '../lib/paths.js'
import { installAnchor, removeAnchor, hasAnchor, anchorFilePath, upsertAnchorBlock } from '../lib/anchor.js'
import { removeCodex, renderCodexAgents, isCodexWired } from '../lib/codex-config.js'
import { syncPeek } from '../lib/wire.js'
import { tryInstallDaemon } from './daemon.js'
import type { Platform } from '../lib/dialect.js'
import { hint, cliName } from '../lib/branding.js'

// ─── Identity commands ──────────────────────────────────────────────────────
//
// Dual-mode by design: a human runs `agentchat register` in a terminal and
// gets prompts; a coding agent runs it with flags and gets deterministic,
// parseable output. The OTP round-trip is split across two invocations
// with the pending state persisted in ~/.agentchat/pending.json, so the
// agent can ask the user for the emailed code conversationally between
// the two calls.

// Canonical handle rule, mirrored from the server (@agentchat/shared) so
// obviously-bad input fails locally with a helpful message instead of a
// round-trip.
const HANDLE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export interface RegisterOpts {
  email?: string
  handle?: string
  displayName?: string
  description?: string
  code?: string
  apiBase?: string
  platform?: Platform
}

interface ApiErrorLike {
  code?: string
  message?: string
  status?: number
}

function describeApiError(err: unknown): string {
  const e = (err ?? {}) as ApiErrorLike
  const code = typeof e.code === 'string' ? e.code : undefined
  const message = typeof e.message === 'string' ? e.message : String(err)
  switch (code) {
    case 'HANDLE_TAKEN':
      return 'That handle is already taken — pick another and re-run.'
    case 'EMAIL_TAKEN':
      return 'This email already has an active agent. Use `agentchat login` with its key, or `agentchat recover --email <email>` to re-key it.'
    case 'EMAIL_EXHAUSTED':
      return 'This email has used its lifetime maximum of 3 registrations.'
    case 'INVALID_HANDLE':
      return 'The server rejected the handle (invalid or reserved word).'
    case 'INVALID_CODE':
      return 'Wrong or expired code. Re-check the 6 digits; after too many misses you must restart with `agentchat register`.'
    case 'EXPIRED':
      return 'This registration expired (codes last 10 minutes). Start over with `agentchat register`.'
    default:
      return code ? `${code}: ${message}` : message
  }
}

function validHandle(handle: string): boolean {
  return handle.length >= 3 && handle.length <= 30 && HANDLE_PATTERN.test(handle)
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

// The MCP server (@agentchatme/mcp ≥ 0.1.111) re-resolves its identity on every
// tool call, so a mid-session register/login is picked up immediately — no
// restart. The soft fallback covers anyone still on an older cached MCP.
const RESTART_HINT =
  'Your messaging tools pick this up immediately — no restart needed. (If a send still says NOT_REGISTERED, you\'re on an older MCP; start a fresh session once to refresh it.)'

/** Human label for the host this identity is scoped to — makes the auto-detected
 *  platform visible ("…for Claude Code") so a multi-agent user can tell which one
 *  got set up (and pass --platform to pick the other). */
function labelFor(p: Platform | undefined): string {
  return p === 'codex' ? 'Codex' : p === 'cursor' ? 'Cursor' : 'Claude Code'
}

/**
 * Write the identity anchor for EXACTLY ONE host — the one being set up.
 *
 * Anchors are per-agent, not per-machine. Each host authenticates with its
 * own credential, so stamping another host's instruction file here would
 * hand that agent a handle it cannot authenticate as: it would advertise an
 * address that routes to a DIFFERENT agent while its own inbox sat at a
 * handle it no longer knew about. Registering one agent must leave every
 * other agent on the box byte-identical.
 */
export function anchorFor(platform: Platform | undefined, handle: string): string[] {
  if (platform === undefined) return []

  if (platform === 'codex') {
    // Codex's always-loaded AGENTS.md carries identity + condensed etiquette
    // (its skills are on-demand and may never trigger). Write it once Codex
    // is actually wired — a bare AGENTS.md with no MCP server and no hooks
    // would be half-wired, but refusing to create it at all forced users to
    // run `agentchat install` a SECOND time after registering just to pick
    // up their own handle.
    const codexAgents = anchorFilePath('codex')
    if (codexAgents === null) return []
    if (!fs.existsSync(codexAgents) && !isCodexWired()) return []
    try {
      const had = fs.existsSync(codexAgents)
      const existing = had ? fs.readFileSync(codexAgents, 'utf-8') : ''
      fs.mkdirSync(path.dirname(codexAgents), { recursive: true })
      fs.writeFileSync(codexAgents, upsertAnchorBlock(existing, renderCodexAgents(handle)), 'utf-8')
      // Fail loud rather than shipping an anchor without the handle in it.
      if (!fs.readFileSync(codexAgents, 'utf-8').includes(`@${handle}`)) {
        throw new Error(`handle @${handle} did not land in ${codexAgents}`)
      }
      return [`  AGENTS.md codex: ${had ? 'refreshed' : 'written'} → ${codexAgents}`]
    } catch (err) {
      return [`  AGENTS.md codex: FAILED — ${String(err)}`]
    }
  }

  // Claude Code gets the generic identity anchor (its bundled skill carries
  // the etiquette). Cursor has no always-loaded instruction file → no anchor.
  const file = anchorFilePath(platform)
  if (file === null) return []
  try {
    installAnchor(platform, handle)
    return [`  anchor ${platform}: written → ${file}`]
  } catch (err) {
    return [`  anchor ${platform}: FAILED — ${String(err)}`]
  }
}

/**
 * Turn on always-on the instant an identity exists (best-effort), so "on by
 * default" is one motion instead of a second command the agent must remember.
 * Returns the lines to append to the success output: a past-tense confirmation
 * when it worked, or the manual pointer (the prior behavior) when it didn't or
 * when we don't know which host to target. Never blocks the identity itself.
 * Exported for unit tests (the install itself is stubbed there).
 */
export function autoDaemon(platform: Platform | undefined): string[] {
  // No --platform (a bare `agentchat register` in a shell) or Cursor (no daemon
  // yet) → we can't tell which host to make reachable, so point at the command.
  if (platform === undefined || platform === 'cursor') {
    return [
      `Next, turn on always-on so you're reachable when the user is away: \`${hint('daemon install')}\` (on by default — \`${hint('daemon disable')}\` for session-only).`,
    ]
  }
  const home = process.env['AGENTCHAT_HOME']?.trim() || hostHome(platform)
  // The first-ever call fetches the runtime (a few seconds) — say so on stderr
  // so a human at a TTY isn't staring at a silent hang. Agents ignore ordering.
  process.stderr.write('Setting up always-on (one-time)…\n')
  const res = tryInstallDaemon(platform, home)
  if (res.ok) {
    return [
      `Always-on is ON — you'll answer DMs even when the user isn't in a session (while this machine is up). Prefer session-only? \`${hint('daemon disable', platform)}\`.`,
    ]
  }
  return [
    `(Always-on didn't auto-start: ${res.detail.split('\n')[0]}) Turn it on when ready: \`${hint('daemon install', platform)}\`.`,
  ]
}

export async function runRegister(opts: RegisterOpts): Promise<number> {
  const apiBase = opts.apiBase ?? process.env['AGENTCHAT_API_BASE'] ?? DEFAULT_API_BASE

  // Completion leg: `agentchat register --code 123456`
  if (opts.code !== undefined) {
    const code = opts.code.trim()
    if (!/^\d{6}$/.test(code)) {
      console.error('The code is the 6-digit number from the verification email.')
      return 1
    }
    const pending = readPending()
    if (pending === null) {
      console.error('No registration in progress. Start with: agentchat register --email <email> --handle <handle>')
      return 1
    }
    if (pending.kind === 'recover') {
      console.error('The pending code belongs to an account RECOVERY — complete it with: agentchat recover --code ' + code)
      return 1
    }
    const pendingHandle = pending.handle
    if (pendingHandle === undefined) {
      clearPending()
      console.error('Pending registration was corrupt — start again with: agentchat register')
      return 1
    }
    try {
      const result = await AgentChatClient.verify(pending.pending_id, code, {
        baseUrl: pending.api_base ?? apiBase,
      })
      writeCredentials({
        api_key: result.apiKey,
        handle: pendingHandle,
        ...(pending.api_base ? { api_base: pending.api_base } : {}),
        created_at: new Date().toISOString(),
      })
      clearPending()
      const anchorReport = anchorFor(opts.platform, pendingHandle)
      console.log(
        [
          `Registered: @${pendingHandle} for ${labelFor(opts.platform)}.`,
          `API key stored at ${credentialsPath()} (never commit this file).`,
          ...anchorReport,
          '',
          'This handle belongs to this coding agent — each agent on the machine gets its own.',
          `Other agents can DM you at @${pendingHandle}. Check \`${hint('status')}\` any time.`,
          ...autoDaemon(opts.platform),
          RESTART_HINT,
        ].join('\n'),
      )
      return 0
    } catch (err) {
      console.error(`Verification failed. ${describeApiError(err)}`)
      return 1
    }
  }

  // Initiation leg. The gate is per-HOST, not per-machine: resolveIdentity()
  // reads the bound host home, so a second coding agent on the same box can
  // still register its own separate identity — that is the point of per-host
  // identity. Only THIS agent having one already is a conflict.
  if (resolveIdentity() !== null) {
    const label = labelFor(opts.platform)
    console.error(
      `${label} already has an AgentChat identity (see \`${hint('status')}\`). Run \`${hint('logout', opts.platform)}\` first to replace it.`,
    )
    return 1
  }
  const inFlight = readPending()
  if (inFlight?.kind === 'recover') {
    console.error(
      'An account recovery is in progress — finish it with `agentchat recover --code <code>`, or discard it with `agentchat logout` before registering.',
    )
    return 1
  }

  let email = opts.email?.trim().toLowerCase()
  let handle = opts.handle?.trim().toLowerCase()
  const interactive = process.stdin.isTTY === true && process.stdout.isTTY === true

  if (!email) {
    if (!interactive) {
      console.error('Missing --email. Usage: agentchat register --email <email> --handle <handle>')
      return 1
    }
    email = (await prompt('Email for verification codes: ')).toLowerCase()
  }
  if (!handle) {
    if (!interactive) {
      console.error('Missing --handle. Usage: agentchat register --email <email> --handle <handle>')
      return 1
    }
    handle = (await prompt('Desired handle (3–30 chars, e.g. sanim-dev): ')).toLowerCase()
  }

  if (!email.includes('@')) {
    console.error(`"${email}" does not look like an email address.`)
    return 1
  }
  if (!validHandle(handle)) {
    console.error(
      `Handle "@${handle}" is invalid. Rules: 3–30 characters, lowercase letters/digits/hyphens, must start with a letter, no trailing or doubled hyphens.`,
    )
    return 1
  }

  try {
    const result = await AgentChatClient.register({
      email,
      handle,
      ...(opts.displayName ? { display_name: opts.displayName } : {}),
      ...(opts.description ? { description: opts.description } : {}),
      baseUrl: apiBase,
    })
    writePending({
      kind: 'register',
      pending_id: result.pending_id,
      email,
      handle,
      ...(apiBase !== DEFAULT_API_BASE ? { api_base: apiBase } : {}),
      created_at: new Date().toISOString(),
    })
    console.log(
      [
        `Verification code sent to ${email} (valid ~10 minutes).`,
        'Complete with: agentchat register --code <6-digit-code>',
      ].join('\n'),
    )
    return 0
  } catch (err) {
    console.error(`Registration failed. ${describeApiError(err)}`)
    return 1
  }
}

export async function runLogin(opts: {
  apiKey?: string
  apiBase?: string
  platform?: Platform
}): Promise<number> {
  const apiBase = opts.apiBase ?? process.env['AGENTCHAT_API_BASE'] ?? DEFAULT_API_BASE
  let apiKey = opts.apiKey?.trim()

  if (!apiKey) {
    if (process.stdin.isTTY !== true) {
      console.error('Missing --api-key. Usage: agentchat login --api-key ac_live_…')
      return 1
    }
    apiKey = await prompt('AgentChat API key (ac_…): ')
  }
  if (apiKey.length < 20) {
    console.error('That does not look like an AgentChat API key (too short).')
    return 1
  }

  try {
    const client = new AgentChatClient({ apiKey, baseUrl: apiBase })
    const me = await client.getMe()
    writeCredentials({
      api_key: apiKey,
      handle: me.handle,
      ...(apiBase !== DEFAULT_API_BASE ? { api_base: apiBase } : {}),
      created_at: new Date().toISOString(),
    })
    const anchorReport = anchorFor(opts.platform, me.handle)
    console.log(
      [
        `Signed in as @${me.handle} for ${labelFor(opts.platform)}.`,
        ...anchorReport,
        ...autoDaemon(opts.platform),
        RESTART_HINT,
      ].join('\n'),
    )
    return 0
  } catch (err) {
    console.error(`Login failed. ${describeApiError(err)}`)
    return 1
  }
}

/**
 * Account recovery: re-key an existing agent when the API key is lost.
 * Same two-invocation OTP shape as registration. The server masks
 * account existence — a missing account still reports "code sent".
 */
export async function runRecover(opts: {
  email?: string
  code?: string
  apiBase?: string
  platform?: Platform
}): Promise<number> {
  const apiBase = opts.apiBase ?? process.env['AGENTCHAT_API_BASE'] ?? DEFAULT_API_BASE

  if (opts.code !== undefined) {
    const code = opts.code.trim()
    if (!/^\d{6}$/.test(code)) {
      console.error('The code is the 6-digit number from the recovery email.')
      return 1
    }
    const pending = readPending()
    if (pending === null || pending.kind !== 'recover') {
      console.error('No recovery in progress. Start with: agentchat recover --email <email>')
      return 1
    }
    try {
      const result = await AgentChatClient.recoverVerify(pending.pending_id, code, {
        baseUrl: pending.api_base ?? apiBase,
      })
      writeCredentials({
        api_key: result.apiKey,
        handle: result.handle,
        ...(pending.api_base ? { api_base: pending.api_base } : {}),
        created_at: new Date().toISOString(),
      })
      clearPending()
      const anchorReport = anchorFor(opts.platform, result.handle)
      console.log(
        [
          `Recovered: @${result.handle} for ${labelFor(opts.platform)} — a fresh API key is stored (the old key is now revoked).`,
          ...anchorReport,
          ...autoDaemon(opts.platform),
          RESTART_HINT,
        ].join('\n'),
      )
      return 0
    } catch (err) {
      console.error(`Recovery failed. ${describeApiError(err)}`)
      return 1
    }
  }

  let email = opts.email?.trim().toLowerCase()
  if (!email) {
    if (process.stdin.isTTY !== true) {
      console.error('Missing --email. Usage: agentchat recover --email <email>')
      return 1
    }
    email = (await prompt('Email the agent was registered with: ')).toLowerCase()
  }
  if (!email.includes('@')) {
    console.error(`"${email}" does not look like an email address.`)
    return 1
  }

  try {
    const result = await AgentChatClient.recover(email, { baseUrl: apiBase })
    if (!result.pending_id) {
      // Existence-masked: no pending id means nothing to verify against.
      console.log('If an agent is registered with that email, a recovery code was sent to it.')
      return 0
    }
    writePending({
      kind: 'recover',
      pending_id: result.pending_id,
      email,
      ...(apiBase !== DEFAULT_API_BASE ? { api_base: apiBase } : {}),
      created_at: new Date().toISOString(),
    })
    console.log(
      [
        'Recovery code sent (valid ~10 minutes).',
        'Complete with: agentchat recover --code <6-digit-code>',
        'Note: completing recovery rotates the API key — anything using the old key stops working.',
      ].join('\n'),
    )
    return 0
  } catch (err) {
    console.error(`Recovery failed. ${describeApiError(err)}`)
    return 1
  }
}

// Run `fn` with AGENTCHAT_HOME temporarily pointed at `home`, then restore.
// Sequential use only (global env) — the status scan awaits one host at a time.
async function withHome<T>(home: string, fn: () => Promise<T>): Promise<T> {
  const prev = process.env['AGENTCHAT_HOME']
  process.env['AGENTCHAT_HOME'] = home
  try {
    return await fn()
  } finally {
    if (prev === undefined) delete process.env['AGENTCHAT_HOME']
    else process.env['AGENTCHAT_HOME'] = prev
  }
}

const STATUS_HOSTS: Array<[Platform, string]> = [
  ['claude-code', 'Claude Code'],
  ['codex', 'Codex'],
]

export async function runStatus(opts: { json?: boolean }): Promise<number> {
  // A bound home (from `--platform`, or an explicit AGENTCHAT_HOME) → the
  // single-identity view. No host → scan every host's identity, since they
  // are now separate agents.
  const bound = (process.env['AGENTCHAT_HOME'] ?? '').trim().length > 0
  if (bound) return statusOne(opts.json ?? false)

  const rows: Array<{ label: string; home: string; platform: Platform }> = []
  for (const [platform, label] of STATUS_HOSTS) {
    const home = hostHome(platform)
    if (readCredentialsFileAt(home) !== null) rows.push({ label, home, platform })
  }
  const legacy = readCredentialsFileAt(legacyMachineHome())

  if (rows.length === 0 && legacy === null) {
    console.log(
      opts.json
        ? JSON.stringify({ identities: [] })
        : [
            'No AgentChat identities on this machine yet. Each coding agent gets its own @handle, and they can DM each other. Set one up:',
            '  Claude Code:  /plugin marketplace add agentchatme/agentchat-coding-agents',
            '                /plugin install agentchat@agentchatme',
            '  Codex:        npx -y @agentchatme/codex',
          ].join('\n'),
    )
    return 0
  }

  if (opts.json) {
    const out: unknown[] = []
    for (const r of rows) out.push({ host: r.label, ...(await withHome(r.home, () => statusData())) })
    if (legacy) out.push({ host: 'legacy (~/.agentchat, shared)', handle: legacy.handle, legacy: true })
    console.log(JSON.stringify({ identities: out }))
    return 0
  }

  for (const r of rows) {
    console.log(`── ${r.label} ──`)
    await withHome(r.home, () => statusOne(false, r.platform))
  }
  if (legacy) {
    console.log('── legacy (~/.agentchat, machine-shared) ──')
    console.log(`@${legacy.handle} — a pre-per-host identity; \`agentchat install\` migrates it into a host.`)
  }
  return 0
}

interface StatusData {
  handle: string
  status: string
  unread: number
}

async function statusData(): Promise<StatusData> {
  const identity = resolveIdentity()
  if (identity === null) return { handle: '?', status: 'unconfigured', unread: 0 }
  const client = new AgentChatClient({ apiKey: identity.apiKey, baseUrl: identity.apiBase })
  const me = await client.getMe()
  const rows = await syncPeek({ apiKey: identity.apiKey, apiBase: identity.apiBase }, { limit: 100 })
  return { handle: me.handle, status: me.status ?? 'unknown', unread: rows.length }
}

async function statusOne(json: boolean, platform?: Platform): Promise<number> {
  const identity = resolveIdentity()
  const pending = readPending()

  if (identity === null) {
    if (json) {
      console.log(
        JSON.stringify({ configured: false, pending: pending !== null, pending_kind: pending?.kind ?? null }),
      )
    } else if (pending?.kind === 'recover') {
      console.log(
        'No identity yet, but an account recovery is waiting on its emailed code — finish with: agentchat recover --code <code>',
      )
    } else if (pending !== null) {
      console.log(
        `No identity yet, but a registration for @${pending.handle ?? '?'} is waiting on its emailed code — finish with: agentchat register --code <code>`,
      )
    } else {
      console.log(`No AgentChat identity for this agent yet. Set one up with: ${hint('register')}`)
    }
    return 0
  }

  try {
    const client = new AgentChatClient({ apiKey: identity.apiKey, baseUrl: identity.apiBase })
    const me = await client.getMe()
    const rows = await syncPeek(
      { apiKey: identity.apiKey, apiBase: identity.apiBase },
      { limit: 100 },
    )
    const unread = rows.length === 100 ? '100+' : String(rows.length)
    // Report THIS agent's anchor. Listing every host's anchor inside one
    // agent's status implied they were facets of a single machine identity;
    // they are separate agents, and only this one's anchor is this one's
    // business. Unscoped (no platform) keeps the machine-wide pair.
    const anchors =
      platform === undefined
        ? { 'claude-code': hasAnchor('claude-code'), codex: hasAnchor('codex') }
        : { [platform]: hasAnchor(platform) }

    if (json) {
      console.log(
        JSON.stringify({
          configured: true,
          handle: me.handle,
          status: me.status ?? 'unknown',
          unread: rows.length,
          unread_capped: rows.length === 100,
          key_source: identity.source,
          api_base: identity.apiBase,
          anchors,
        }),
      )
    } else {
      console.log(
        [
          `@${me.handle} — ${me.status ?? 'active'}`,
          `Unread: ${unread} message(s) queued`,
          `Key source: ${identity.source} (${identity.source === 'file' ? credentialsPath() : 'AGENTCHAT_API_KEY'})`,
          `API: ${identity.apiBase}`,
          `Anchor: ${Object.entries(anchors)
            .map(([key, present]) => `${labelFor(key as Platform)} ${present ? 'yes' : 'no'}`)
            .join(' · ')}`,
        ].join('\n'),
      )
    }
    return 0
  } catch (err) {
    console.error(`Could not reach AgentChat: ${describeApiError(err)}`)
    return 1
  }
}

export interface LogoutOpts {
  /** The single host to sign out (already bound by the caller). */
  platform?: Platform
  /** Opt in to signing out EVERY agent on this machine. */
  all?: boolean
}

/**
 * Sign out ONE coding agent — or, with an explicit `--all`, every one.
 *
 * Single-host is the default because each host is a separate agent with its
 * own account: signing out of Claude Code must never delete the Codex
 * agent's credentials or strip its MCP server and hooks. Removing another
 * agent's wiring is unrecoverable without a full re-install, so it is opt-in
 * and never a side effect of an unrelated command.
 */
export function runLogout(opts: LogoutOpts = {}): number {
  const reports: string[] = []
  let any = false

  // Clear the identity + wiring of the host whose home is CURRENTLY bound.
  // Only ever touches `platform` — never a sibling host.
  const forgetBoundHost = (platform: Platform, label: string): void => {
    try {
      if (clearCredentials()) {
        any = true
        reports.push(`  ${label}: credentials deleted`)
      }
      if (platform === 'claude-code') {
        const r = removeAnchor('claude-code')
        if (r.action === 'removed') reports.push('  Claude Code: anchor removed')
      } else if (platform === 'codex') {
        const removed = removeCodex()
        if (removed.length > 0) reports.push(`  Codex: removed ${removed.join(', ')}`)
      }
    } catch {
      reports.push(`  ${label}: could not fully clean up`)
    }
  }

  const withBoundHome = (home: string, fn: () => void): void => {
    const prev = process.env['AGENTCHAT_HOME']
    process.env['AGENTCHAT_HOME'] = home
    try {
      fn()
    } finally {
      if (prev === undefined) delete process.env['AGENTCHAT_HOME']
      else process.env['AGENTCHAT_HOME'] = prev
    }
  }

  if (opts.all === true) {
    for (const [platform, label] of STATUS_HOSTS) {
      withBoundHome(hostHome(platform), () => forgetBoundHost(platform, label))
    }
    // Pre-per-host machine-global identity, if one is still lying around.
    withBoundHome(legacyMachineHome(), () => {
      if (clearCredentials()) {
        any = true
        reports.push('  legacy (~/.agentchat): credentials deleted')
      }
    })
  } else {
    // index.ts resolves the host and binds its home before we get here; the
    // fallback keeps a direct programmatic call honest rather than silently
    // widening to every agent.
    const platform = opts.platform ?? 'claude-code'
    forgetBoundHost(platform, labelFor(platform))
  }

  const scopeNote =
    opts.all === true
      ? []
      : [`Other coding agents on this machine keep their own identity. Sign out of everything with: ${cliName()} logout --all`]

  console.log(
    [any ? 'Signed out.' : 'Nothing to sign out of.', ...reports, ...(any ? scopeNote : [])].join('\n'),
  )
  return 0
}
