import { z } from 'zod'
import { log } from './log.js'

// ─── Wire shapes + HTTP fallback drain ──────────────────────────────────────
//
// The socket is ACK-CAPABLE (opted in via the `x-agentchat-capabilities: ack`
// request header): the server leaves deliveries 'stored' until we ack, so a
// crash mid-processing re-drains on reconnect (at-least-once). We ack over the
// WS by MESSAGE id (`{"type":"ack","message_id":"msg_..."}`) — the one field
// present on BOTH real-time pushes and reconnect-drain frames. Real-time frames
// carry NO delivery_id (that's a REST /sync concept), so the schema treats it
// as optional. syncPeek/syncAck below are the belt-and-suspenders REST fallback
// (that path always has delivery_id). Same bare-array / string-cursor wire the
// coding-agents CLI uses (SDK still mis-types this path).

export interface WireConfig {
  apiKey: string
  apiBase: string
  timeoutMs?: number
}

const SyncRowSchema = z
  .object({
    id: z.string(),
    conversation_id: z.string(),
    // Present on REST /sync + reconnect-drain rows; ABSENT on real-time pushes.
    delivery_id: z.string().nullish(),
    sender: z.string().optional(),
    sender_handle: z.string().optional(),
    type: z.string().optional(),
    content: z.record(z.unknown()).optional(),
    created_at: z.string().optional(),
  })
  .passthrough()

export type SyncRow = z.infer<typeof SyncRowSchema>

async function request(cfg: WireConfig, method: 'GET' | 'POST', pathname: string, body?: unknown): Promise<unknown> {
  const url = cfg.apiBase.replace(/\/+$/, '') + pathname
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(cfg.timeoutMs ?? 6000),
  })
  if (!res.ok) throw new Error(`AgentChat API ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  return res.json()
}

export function parseInbound(payload: unknown): SyncRow | null {
  const parsed = SyncRowSchema.safeParse(payload)
  return parsed.success ? parsed.data : null
}

export function senderOf(row: SyncRow): string {
  return row.sender ?? row.sender_handle ?? 'unknown'
}

/** Commit deliveries at-or-before the cursor. Injection/handling = delivered. */
export async function syncAck(cfg: WireConfig, lastDeliveryId: string): Promise<number> {
  const data = await request(cfg, 'POST', '/v1/messages/sync/ack', { last_delivery_id: lastDeliveryId })
  const parsed = z.object({ acked: z.number() }).safeParse(data)
  return parsed.success ? parsed.data.acked : 0
}

/** Non-destructive peek — a fallback drain if the WS ever misses (belt-and-
 *  suspenders; the WS already drains on connect). */
export async function syncPeek(cfg: WireConfig, after?: string): Promise<SyncRow[]> {
  const qs = after ? `?after=${encodeURIComponent(after)}&limit=200` : '?limit=200'
  const data = await request(cfg, 'GET', `/v1/messages/sync${qs}`)
  if (!Array.isArray(data)) {
    log.warn(`sync returned non-array (${typeof data})`)
    return []
  }
  const rows: SyncRow[] = []
  for (const item of data) {
    const p = SyncRowSchema.safeParse(item)
    if (p.success) rows.push(p.data)
    else break // never ack past an unparseable row
  }
  return rows
}
