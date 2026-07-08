import { log } from './log.js'

// ─── Hook stdin parsing ─────────────────────────────────────────────────────
//
// Every host pipes a JSON event object to the hook on stdin. We only need
// two things from it — a session identifier (for the continuation cap) and
// the host's own loop guard if present — and we must never fail if the
// shape surprises us: a hook that dies on parse breaks every session.

export interface HookInput {
  sessionId: string
  /** Claude Code sets stop_hook_active when a turn was already continued
   *  by a Stop hook — honored as a host-side loop guard alongside ours. */
  stopHookActive: boolean
}

export async function readHookInput(stream: NodeJS.ReadStream = process.stdin): Promise<HookInput> {
  let raw = ''
  if (!stream.isTTY) {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
        if (Buffer.concat(chunks).length > 1_000_000) break // never buffer unbounded stdin
      }
      raw = Buffer.concat(chunks).toString('utf-8')
    } catch {
      raw = ''
    }
  }

  let parsed: Record<string, unknown> = {}
  if (raw.trim().length > 0) {
    try {
      const value = JSON.parse(raw)
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>
      }
    } catch {
      log.debug('hook stdin was not valid JSON; proceeding with defaults')
    }
  }

  const sessionId =
    firstString(parsed, ['session_id', 'sessionId', 'thread_id', 'conversation_id']) ?? 'unknown'
  const stopHookActive = parsed['stop_hook_active'] === true

  return { sessionId, stopHookActive }
}

function firstString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return null
}
