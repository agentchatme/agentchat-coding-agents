import { z } from 'zod'
import { log } from './log.js'

// ─── Raw sync/ack wire client ───────────────────────────────────────────────
//
// The hooks deliberately do NOT use the `agentchatme` SDK for /sync and
// /sync/ack: production returns a BARE ARRAY of rows whose `delivery_id`
// is an opaque STRING cursor (`del_<32 hex>`), and SDK v1.0.2 still types
// this path as an envelope object with numeric ids — a silent zero-row
// drain. These two endpoints are typed here against the real wire until
// the SDK ships its fix; everything else goes through the SDK.
//
// Rows failing the minimal schema are skipped, never fatal: a hook that
// throws on an unexpected field would break every session start.

const SyncRowSchema = z
  .object({
    id: z.string(),
    conversation_id: z.string(),
    delivery_id: z.string().nullable(),
    sender_handle: z.string().optional(),
    type: z.string().optional(),
    content: z.record(z.unknown()).optional(),
    created_at: z.string().optional(),
  })
  .passthrough()

export type SyncRow = z.infer<typeof SyncRowSchema>

export interface WireConfig {
  apiKey: string
  apiBase: string
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 4_000

async function request(
  cfg: WireConfig,
  method: 'GET' | 'POST',
  pathname: string,
  body?: unknown,
): Promise<unknown> {
  // Join by concatenation, exactly like the SDK's HttpTransport — `new URL`
  // with an absolute pathname would clobber a path component in the base
  // (e.g. a reverse-proxy prefix), splitting behavior between the SDK-based
  // commands and the hooks.
  const url = cfg.apiBase.replace(/\/+$/, '') + pathname
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new WireError(res.status, text.slice(0, 300))
  }
  return res.json()
}

export class WireError extends Error {
  readonly status: number
  constructor(status: number, detail: string) {
    super(`AgentChat API ${status}: ${detail}`)
    this.name = 'WireError'
    this.status = status
  }
}

/**
 * Non-destructive peek at undelivered messages, oldest first. Does not
 * mark anything delivered — pair with `syncAck` once the rows have been
 * handed to the agent.
 */
export async function syncPeek(
  cfg: WireConfig,
  opts: { limit?: number; after?: string } = {},
): Promise<SyncRow[]> {
  const params = new URLSearchParams()
  if (opts.limit !== undefined) params.set('limit', String(opts.limit))
  if (opts.after !== undefined) params.set('after', opts.after)
  const qs = params.toString()

  const data = await request(cfg, 'GET', `/v1/messages/sync${qs ? `?${qs}` : ''}`)
  if (!Array.isArray(data)) {
    log.warn(`sync returned non-array payload (${typeof data}); treating as empty`)
    return []
  }

  // Stop at the FIRST row that fails the schema instead of skipping it:
  // the ack cursor covers everything at-or-before it, so acking past an
  // unparsed row would mark a message delivered that was never surfaced.
  // Processing the clean prefix keeps us safe AND making progress.
  const rows: SyncRow[] = []
  for (const [index, item] of data.entries()) {
    const parsed = SyncRowSchema.safeParse(item)
    if (!parsed.success) {
      log.warn(
        `sync row ${index} failed schema parse — processing the ${rows.length}-row prefix only`,
      )
      break
    }
    rows.push(parsed.data)
  }
  return rows
}

/**
 * Commit every delivery at-or-before the cursor as delivered. In the
 * plugin model this is called at the moment rows are injected into the
 * agent's context — injection IS delivery.
 */
export async function syncAck(cfg: WireConfig, lastDeliveryId: string): Promise<number> {
  const data = await request(cfg, 'POST', '/v1/messages/sync/ack', {
    last_delivery_id: lastDeliveryId,
  })
  const parsed = z.object({ acked: z.number() }).safeParse(data)
  return parsed.success ? parsed.data.acked : 0
}

/**
 * Minimal self-lookup for hooks that resolved an env-var key with no
 * credentials file (so no cached handle). Full profile reads go through
 * the SDK; hooks only ever need the handle.
 */
export async function getMeLite(cfg: WireConfig): Promise<{ handle: string } | null> {
  try {
    const data = await request(cfg, 'GET', '/v1/agents/me')
    const parsed = z.object({ handle: z.string() }).passthrough().safeParse(data)
    return parsed.success ? { handle: parsed.data.handle } : null
  } catch {
    return null
  }
}

/** Latest ackable cursor from a batch of rows (rows arrive oldest-first). */
export function lastDeliveryId(rows: SyncRow[]): string | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const id = rows[i]?.delivery_id
    if (typeof id === 'string' && id.length > 0) return id
  }
  return null
}
