import { log } from '../lib/log.js'
import { resolveIdentity } from '../lib/credentials.js'
import { readHookInput } from '../lib/hook-input.js'
import {
  getContinuations,
  recordContinuation,
  resetSession,
  shouldOfferRegistration,
  recordRegistrationOffer,
} from '../lib/state.js'
import { syncPeek, syncAck, lastDeliveryId, type WireConfig } from '../lib/wire.js'
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
//   3. Ack-on-injection: rows are acked in the same invocation that prints
//      them into context. Ack failure still injects (at-least-once, same
//      posture as the server's delivery model); cap-exceeded never acks so
//      queued messages surface at the next session start instead.

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

async function resolveHandle(cfg: WireConfig, cachedHandle: string | null): Promise<string> {
  if (cachedHandle) return cachedHandle
  const me = await getMeLite(cfg)
  return me?.handle ?? 'your-agentchat-handle'
}

export async function runSessionStartHook(platform: Platform): Promise<void> {
  try {
    if (hooksDisabled()) return
    const input = await readHookInput()

    // A session start is a new sitting — give this session a fresh stop-hook
    // continuation budget (matters when resuming a session that hit the cap).
    resetSession(`${platform}:${input.sessionId}`)

    const identity = resolveIdentity()
    if (identity === null) {
      // First-run experience: let the agent offer registration — but at most
      // once a day machine-wide, not once per session. An unregistered
      // plugin should be quiet, not a nag.
      if (shouldOfferRegistration()) {
        recordRegistrationOffer()
        printJson(sessionStartOutput(platform, formatRegistrationOffer()))
      }
      return
    }

    const cfg: WireConfig = { apiKey: identity.apiKey, apiBase: identity.apiBase }
    const rows = await syncPeek(cfg, { limit: SESSION_START_PEEK_LIMIT })
    if (rows.length === 0) return

    const handle = await resolveHandle(cfg, identity.handle)
    const context = formatSessionStart(handle, rows)

    const cursor = lastDeliveryId(rows)
    if (cursor !== null) {
      try {
        await syncAck(cfg, cursor)
      } catch (err) {
        log.warn(`session-start ack failed (will re-surface next session): ${String(err)}`)
      }
    }

    printJson(sessionStartOutput(platform, context))
  } catch (err) {
    log.warn(`session-start hook degraded to no-op: ${String(err)}`)
  }
}

export async function runStopHook(platform: Platform): Promise<void> {
  try {
    if (hooksDisabled()) return

    const input = await readHookInput()
    const identity = resolveIdentity()
    if (identity === null) return

    const sessionKey = `${platform}:${input.sessionId}`
    const cap = maxContinuations()
    if (getContinuations(sessionKey) >= cap) {
      log.info(`stop hook: continuation cap (${cap}) reached for ${sessionKey}; leaving inbox queued`)
      return
    }

    const cfg: WireConfig = { apiKey: identity.apiKey, apiBase: identity.apiBase }
    const rows = await syncPeek(cfg, { limit: STOP_PEEK_LIMIT })
    if (rows.length === 0) return

    recordContinuation(sessionKey)

    const handle = await resolveHandle(cfg, identity.handle)
    const reason = formatStopPickup(handle, rows)

    const cursor = lastDeliveryId(rows)
    if (cursor !== null) {
      try {
        await syncAck(cfg, cursor)
      } catch (err) {
        log.warn(`stop ack failed (messages stay queued): ${String(err)}`)
      }
    }

    printJson(stopOutput(platform, reason))
  } catch (err) {
    log.warn(`stop hook degraded to no-op: ${String(err)}`)
  }
}
