import { describe, expect, it } from 'vitest'
import { sessionStartOutput, stopOutput, PLATFORMS } from '../src/lib/dialect.js'

// ─── Golden fixtures ────────────────────────────────────────────────────────
//
// These pin the EXACT wire shape each host expects from a hook. If a host
// renames a field (young APIs — it will happen), the fix lands here first,
// deliberately, instead of the hook silently becoming a no-op in the field.
// Do not "refactor" these to share structure with src/lib/dialect.ts — the
// duplication is the point.

const SESSION_START_GOLDEN: Record<string, unknown> = {
  'claude-code': {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: 'CTX',
    },
  },
  codex: {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: 'CTX',
    },
  },
  cursor: {
    additional_context: 'CTX',
  },
}

const STOP_GOLDEN: Record<string, unknown> = {
  'claude-code': {
    decision: 'block',
    reason: 'REASON',
  },
  codex: {
    decision: 'block',
    reason: 'REASON',
  },
  cursor: {
    followup_message: 'REASON',
  },
}

describe('hook dialects (golden)', () => {
  it.each([...PLATFORMS])('session-start shape for %s', (platform) => {
    expect(sessionStartOutput(platform, 'CTX')).toStrictEqual(SESSION_START_GOLDEN[platform])
  })

  it.each([...PLATFORMS])('stop shape for %s', (platform) => {
    expect(stopOutput(platform, 'REASON')).toStrictEqual(STOP_GOLDEN[platform])
  })
})
