import { log } from '../lib/log.js'
import { resolveIdentity } from '../lib/credentials.js'
import { bindHostHome } from '../lib/paths.js'
import { readHookInput } from '../lib/hook-input.js'
import {
  getContinuations,
  recordContinuation,
  resetSession,
  setPendingAck,
  takePendingAck,
  shouldOfferRegistration,
  recordRegistrationOffer,
} from '../lib/state.js'
import {
  syncPeek,
  syncAck,
  lastDeliveryId,
  markSessionActive,
  claimReply,
  type WireConfig,
  type SyncRow,
} from '../lib/wire.js'
import { getMeLite } from '../lib/wire.js'
import {
  formatSessionStart,
  formatStopPickup,
  formatRegistrationOffer,
} from '../lib/summary.js'
import { sessionStartOutput, stopOutput, type Platform } from '../lib/dialect.js'

// ─── Hook commands ──────────────────────────────────────────────────────────
//
// Invariants that hold no matter what goes wrong:
//   1. Exit code is ALWAYS 0. A failing hook must degrade to "no AgentChat
//      context this turn", never to a broken session.
//   2. stdout carries either one JSON object (the platform dialect) or
//      nothing at all (no-op). Diagnostics go to stderr only.
//   3. Ack only when a session PROVES it is real. Session-start injects
//      the digest and records the cursor as pending; the user-prompt hook
//      commits it — a prompt actually running is the proof. A session that
//      dies before its first prompt (arg-error invocation, crashed
//      startup — live-fired 2026-07-12) leaves the batch unacked and it
//      re-digests next session: duplicate beats loss, always. The stop
//      hook acks at print time (a turn is running by definition there).
//      Cap-exceeded never acks. Rows without an ackable delivery_id are
//      never injected — they could only re-inject forever.

const SESSION_START_PEEK_LIMIT = 100
const STOP_PEEK_LIMIT = 50
const DEFAULT_MAX_CONTINUATIONS = 5

function hooksDisabled(): boolean {
  return process.env['AGENTCHAT_HOOKS_ENABLED'] === '0'
}

function maxContinuations(): number {
  const raw = process.env['AGENTCHAT_HOOK_MAX_CONTINUATIONS']
  if (raw === undefined) return DEFAULT_MAX_CONTINUATIONS
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MAX_CONTINUATIONS
}

function printJson(payload: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(payload) + '\n')
}

async function resolveHandle(cfg: WireConfig, cachedHandle: string | null): Promise<string | null> {
  if (cachedHandle) return cachedHandle
  const me = await getMeLite(cfg)
  return me?.handle ?? null // never inject a made-up handle into the agent's identity
}

/** Only rows with a real delivery cursor can be surfaced — an unackable row
 *  would re-inject on every hook run forever. (The production sync path
 *  always has one; this guards the typed-nullable case.) */
function ackableRows<T extends { delivery_id: string | null }>(rows: T[]): T[] {
  const usable = rows.filter((r) => typeof r.delivery_id === 'string' && r.delivery_id.length > 0)
  if (usable.length < rows.length) {
    log.warn(`${rows.length - usable.length} sync row(s) without delivery_id excluded from digest`)
  }
  return usable
}

/**
 * Coexistence with the always-on daemon: claim the sole right to reply to each
 * row before surfacing it, so the daemon stands down for what this session
 * takes. Returns the CONTIGUOUS oldest-first prefix this session won — stopping
 * at the first row the daemon already owns keeps the ack cursor (which commits
 * everything at-or-before it) from acking a message the daemon is mid-turn on.
 * Claims run in parallel; each is fail-open (a coord outage yields the row to
 * this session, i.e. today's behavior). Rows past a daemon-owned one stay
 * queued and re-surface next turn — duplicate beats loss, per invariant 3.
 */
async function claimContiguousPrefix(
  cfg: WireConfig,
  rows: SyncRow[],
  holder: string,
): Promise<SyncRow[]> {
  const won = await Promise.all(rows.map((r) => claimReply(cfg, r.id, holder)))
  const prefix: SyncRow[] = []
  for (let i = 0; i < rows.length; i++) {
    if (!won[i]) break // daemon owns this one — stop so the ack cursor stays clean
    prefix.push(rows[i] as SyncRow)
  }
  if (prefix.length < rows.length) {
    log.info(`coexistence: daemon owns ${rows.length - prefix.length} row(s); surfacing ${prefix.length}`)
  }
  return prefix
}

export async function runSessionStartHook(platform: Platform): Promise<void> {
  try {
    if (hooksDisabled()) return
    // Resolve THIS host's identity (Claude vs Codex are distinct agents).
    bindHostHome(platform)
    const input = await readHookInput()

    // Compaction is NOT a new sitting: the hooks.json matcher already
    // excludes it on Claude Code, and this guard covers hosts/installs
    // without matcher support. Resetting the stop budget on compact would
    // let two chatting agents refill their loop cap every time their own
    // ping-pong forces a compaction — unbounded, the exact loop the cap
    // exists to stop.
    if (input.source === 'compact') return

    // A session start is a new sitting — give this session a fresh stop-hook
    // continuation budget (matters when resuming a session that hit the cap).
    resetSession(`${platform}:${input.sessionId}`)

    const identity = resolveIdentity()
    if (identity === null) {
      // First-run experience: let the agent offer registration — but at most
      // once a day machine-wide, not once per session. An unregistered
      // plugin should be quiet, not a nag. process.argv[1] is this bundle,
      // the one CLI invocation guaranteed to exist on a fresh machine.
      if (shouldOfferRegistration()) {
        recordRegistrationOffer()
        printJson(sessionStartOutput(platform, formatRegistrationOffer(process.argv[1], platform)))
      }
      return
    }

    const cfg: WireConfig = { apiKey: identity.apiKey, apiBase: identity.apiBase }
    // Announce this session so the always-on daemon (if the user runs one)
    // yields incoming messages to it. Fail-open: a no-op without /v1/reply.
    await markSessionActive(cfg)

    const peeked = ackableRows(await syncPeek(cfg, { limit: SESSION_START_PEEK_LIMIT }))
    if (peeked.length === 0) return
    // Claim what we surface so the daemon stands down for exactly these rows.
    const rows = await claimContiguousPrefix(cfg, peeked, `session:${input.sessionId}`)
    if (rows.length === 0) return

    const handle = await resolveHandle(cfg, identity.handle)
    const context = formatSessionStart(handle, rows)

    // Record the cursor as pending — committed by the user-prompt hook
    // once a turn actually runs (invariant 3). Then inject.
    const cursor = lastDeliveryId(rows)
    if (cursor !== null) {
      setPendingAck(`${platform}:${input.sessionId}`, cursor)
    }
    printJson(sessionStartOutput(platform, context))
  } catch (err) {
    log.warn(`session-start hook degraded to no-op: ${String(err)}`)
  }
}

/**
 * UserPromptSubmit: a prompt is running, so the session is real — commit
 * the digest batch that session-start injected. Silent in every outcome.
 */
export async function runUserPromptHook(platform: Platform): Promise<void> {
  try {
    if (hooksDisabled()) return
    bindHostHome(platform)
    const input = await readHookInput()
    const identity = resolveIdentity()
    if (identity === null) return

    const sessionKey = `${platform}:${input.sessionId}`
    const cursor = takePendingAck(sessionKey)
    if (cursor === null) return

    const cfg: WireConfig = { apiKey: identity.apiKey, apiBase: identity.apiBase }
    try {
      await syncAck(cfg, cursor)
    } catch (err) {
      // Put it back — the next prompt retries. Rows stay stored server-side
      // either way, so the worst case is a duplicate digest next session.
      setPendingAck(sessionKey, cursor)
      log.warn(`user-prompt ack failed (will retry next prompt): ${String(err)}`)
    }
  } catch (err) {
    log.warn(`user-prompt hook degraded to no-op: ${String(err)}`)
  }
}

export async function runStopHook(platform: Platform): Promise<void> {
  try {
    if (hooksDisabled()) return
    bindHostHome(platform)

    const input = await readHookInput()
    const identity = resolveIdentity()
    if (identity === null) return

    const sessionKey = `${platform}:${input.sessionId}`
    const cfg: WireConfig = { apiKey: identity.apiKey, apiBase: identity.apiBase }
    // Keep announcing this session so the daemon keeps yielding — even when
    // we're capped this sitting: a capped session still OWNS its inbox, and
    // the daemon taking over would defeat the continuation loop-guard.
    await markSessionActive(cfg)

    const cap = maxContinuations()
    if (getContinuations(sessionKey) >= cap) {
      log.info(`stop hook: continuation cap (${cap}) reached for ${sessionKey}; leaving inbox queued`)
      return
    }

    const peeked = ackableRows(await syncPeek(cfg, { limit: STOP_PEEK_LIMIT }))
    if (peeked.length === 0) return
    // Claim what we surface so the daemon stands down for exactly these rows.
    const rows = await claimContiguousPrefix(cfg, peeked, `session:${input.sessionId}`)
    if (rows.length === 0) return

    recordContinuation(sessionKey)

    const handle = await resolveHandle(cfg, identity.handle)
    const reason = formatStopPickup(handle, rows)

    // Print first, ack second: see invariant 3 in the header.
    printJson(stopOutput(platform, reason))

    const cursor = lastDeliveryId(rows)
    if (cursor !== null) {
      try {
        await syncAck(cfg, cursor)
      } catch (err) {
        log.warn(`stop ack failed (messages stay queued): ${String(err)}`)
      }
    }
  } catch (err) {
    log.warn(`stop hook degraded to no-op: ${String(err)}`)
  }
}
