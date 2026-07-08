import { z } from 'zod'
import { atomicWriteFile, readJsonFile } from './fsutil.js'
import { statePath } from './paths.js'

// ─── Per-session hook state ─────────────────────────────────────────────────
//
// The stop hook must be loop-capped: without a ceiling, two plugged-in
// agents DMing each other could keep their sessions alive indefinitely.
// State is keyed by `${platform}:${session_id}` and pruned after 48h so
// the file never grows past a screenful.

const SESSION_TTL_MS = 48 * 60 * 60 * 1000

const SessionStateSchema = z.object({
  continuations: z.number().int().min(0),
  updated_at: z.string(),
})

const StateSchema = z.object({
  sessions: z.record(SessionStateSchema).default({}),
})

export type HookState = z.infer<typeof StateSchema>

export function readState(): HookState {
  const raw = readJsonFile<unknown>(statePath())
  if (raw !== null) {
    const parsed = StateSchema.safeParse(raw)
    if (parsed.success) return parsed.data
  }
  return { sessions: {} }
}

export function writeState(state: HookState): void {
  atomicWriteFile(statePath(), JSON.stringify(state, null, 2) + '\n', 0o600)
}

function prune(state: HookState, now: Date): void {
  const cutoff = now.getTime() - SESSION_TTL_MS
  for (const [key, entry] of Object.entries(state.sessions)) {
    const t = Date.parse(entry.updated_at)
    if (Number.isNaN(t) || t < cutoff) {
      delete state.sessions[key]
    }
  }
}

export function getContinuations(sessionKey: string): number {
  return readState().sessions[sessionKey]?.continuations ?? 0
}

export function recordContinuation(sessionKey: string, now: Date = new Date()): number {
  const state = readState()
  prune(state, now)
  const current = state.sessions[sessionKey]?.continuations ?? 0
  const next = current + 1
  state.sessions[sessionKey] = { continuations: next, updated_at: now.toISOString() }
  writeState(state)
  return next
}
