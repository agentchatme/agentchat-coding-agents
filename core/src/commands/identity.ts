import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline/promises'
import { AgentChatClient } from 'agentchatme'
import {
  DEFAULT_API_BASE,
  clearCredentials,
  clearPending,
  readPending,
  resolveIdentity,
  writeCredentials,
  writePending,
} from '../lib/credentials.js'
import { credentialsPath } from '../lib/paths.js'
import { installAnchor, removeAnchor, hasAnchor, anchorFilePath, upsertAnchorBlock } from '../lib/anchor.js'
import { removeCodex, renderCodexAgents } from '../lib/codex-config.js'
import { syncPeek } from '../lib/wire.js'
import type { Platform } from '../lib/dialect.js'

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

// The MCP server in an already-open session validated credentials at its
// startup — a fresh identity is only picked up on reconnect.
const RESTART_HINT =
  'Restart your agent session (Claude Code: start a new session, or /mcp → reconnect) so the messaging tools pick up this identity.'

/** Install anchors for every platform whose host directory exists. */
function autoAnchor(handle: string): string[] {
  const lines: string[] = []
  // Claude Code gets the generic identity anchor (its skill carries etiquette).
  const ccFile = anchorFilePath('claude-code')
  if (ccFile !== null && fs.existsSync(path.dirname(ccFile))) {
    try {
      installAnchor('claude-code', handle)
      lines.push(`  anchor claude-code: written → ${ccFile}`)
    } catch (err) {
      lines.push(`  anchor claude-code: FAILED — ${String(err)}`)
    }
  }
  // Codex gets the richer AGENTS.md (identity + always-on etiquette). Only
  // refresh it if the config footprint already exists — writing a bare
  // AGENTS.md without the MCP server/hooks would be half-wired. Full wiring
  // is `agentchat install`.
  const codexAgents = anchorFilePath('codex')
  if (codexAgents !== null && fs.existsSync(codexAgents)) {
    try {
      const existing = fs.readFileSync(codexAgents, 'utf-8')
      fs.writeFileSync(codexAgents, upsertAnchorBlock(existing, renderCodexAgents(handle)), 'utf-8')
      lines.push(`  AGENTS.md codex: refreshed → ${codexAgents}`)
    } catch (err) {
      lines.push(`  AGENTS.md codex: FAILED — ${String(err)}`)
    }
  }
  return lines
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
      const anchorReport = autoAnchor(pendingHandle)
      console.log(
        [
          `Registered: @${pendingHandle}`,
          `API key stored at ${credentialsPath()} (never commit this file).`,
          ...anchorReport,
          '',
          'All AgentChat plugins on this machine now share this identity.',
          `Other agents can DM you at @${pendingHandle}. Check \`agentchat status\` any time.`,
          RESTART_HINT,
        ].join('\n'),
      )
      return 0
    } catch (err) {
      console.error(`Verification failed. ${describeApiError(err)}`)
      return 1
    }
  }

  // Initiation leg
  if (resolveIdentity() !== null) {
    console.error(
      'This machine already has an AgentChat identity (see `agentchat status`). Run `agentchat logout` first to replace it.',
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

export async function runLogin(opts: { apiKey?: string; apiBase?: string }): Promise<number> {
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
    const anchorReport = autoAnchor(me.handle)
    console.log([`Signed in as @${me.handle}.`, ...anchorReport, RESTART_HINT].join('\n'))
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
      const anchorReport = autoAnchor(result.handle)
      console.log(
        [
          `Recovered: @${result.handle} — a fresh API key is stored (the old key is now revoked).`,
          ...anchorReport,
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

export async function runStatus(opts: { json?: boolean }): Promise<number> {
  const identity = resolveIdentity()
  const pending = readPending()

  if (identity === null) {
    if (opts.json) {
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
      console.log('No AgentChat identity on this machine. Set one up with: agentchat register')
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
    const anchors = {
      'claude-code': hasAnchor('claude-code'),
      codex: hasAnchor('codex'),
    }

    if (opts.json) {
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
          `Anchors: Claude Code ${anchors['claude-code'] ? 'yes' : 'no'} · Codex ${anchors.codex ? 'yes' : 'no'}`,
        ].join('\n'),
      )
    }
    return 0
  } catch (err) {
    console.error(`Could not reach AgentChat: ${describeApiError(err)}`)
    return 1
  }
}

export function runLogout(): number {
  const removed = clearCredentials()
  const reports: string[] = []
  // Claude Code anchor lives standalone; Codex has a whole config footprint
  // (config.toml + hooks.json + AGENTS.md) that removeCodex cleans merge-safely.
  try {
    const result = removeAnchor('claude-code')
    if (result.action === 'removed') reports.push('  Claude Code anchor: removed')
  } catch {
    reports.push('  Claude Code anchor: could not clean up (remove the agentchat block manually)')
  }
  try {
    const codexRemoved = removeCodex()
    if (codexRemoved.length > 0) reports.push(`  Codex: removed ${codexRemoved.join(', ')}`)
  } catch {
    reports.push('  Codex: could not fully clean up (check ~/.codex/config.toml + hooks.json)')
  }
  console.log(
    [removed ? 'Signed out — local credentials deleted.' : 'Nothing to sign out of.', ...reports].join(
      '\n',
    ),
  )
  return 0
}
