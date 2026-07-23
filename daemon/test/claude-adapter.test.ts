import { describe, expect, it } from 'vitest'
import { sessionUuid } from '../src/adapters/claude.js'

// The Claude adapter maps each AgentChat conversation to a STABLE claude
// session id derived from the conversation id, so a daemon restart resumes the
// same session (turn N remembers turns 1..N-1) without persisting any id.
// If this stops being deterministic, restart-resume silently breaks.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('sessionUuid', () => {
  it('is deterministic for a conversation id', () => {
    expect(sessionUuid('conv_abc')).toBe(sessionUuid('conv_abc'))
  })

  it('differs across conversations', () => {
    expect(sessionUuid('conv_abc')).not.toBe(sessionUuid('conv_xyz'))
  })

  it('is a syntactically valid v5-shaped UUID (claude rejects malformed ids)', () => {
    expect(sessionUuid('conv_WntienY94G2kU7F_')).toMatch(UUID_RE)
    expect(sessionUuid('x')).toMatch(UUID_RE)
    expect(sessionUuid('')).toMatch(UUID_RE)
  })
})
