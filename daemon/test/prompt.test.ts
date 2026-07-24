import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildPrompt as buildClaudePrompt } from '../src/adapters/claude.js'
import { buildPrompt as buildCodexPrompt } from '../src/adapters/codex.js'

// The daemon's first-touch prompt is the only context a headless turn sees
// before it decides whether to reply, so its orientation fields (when / who /
// where / body) are load-bearing. Both adapters share the same shape.

const NOW = Date.parse('2026-07-24T15:00:00.000Z')

describe.each([
  ['claude-code', buildClaudePrompt],
  ['codex', buildCodexPrompt],
])('buildPrompt (%s)', (_name, buildPrompt) => {
  afterEach(() => vi.useRealTimers())

  it('surfaces a relative + absolute timestamp for a direct message', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const p = buildPrompt({
      conversationId: 'conv_abc',
      sender: 'alice',
      text: 'can you review the deploy?',
      createdAt: '2026-07-24T14:57:00.000Z', // 3 min before NOW
      type: 'text',
    })
    expect(p).toContain('3 minutes ago (2026-07-24 14:57 UTC)')
    expect(p).toContain('the direct conversation conv_abc')
    expect(p).toContain('from @alice')
    expect(p).toContain('"can you review the deploy?"')
  })

  it('labels a group conversation as such (not an opaque id alone)', () => {
    const p = buildPrompt({
      conversationId: 'grp_team',
      sender: 'bob',
      text: 'standup in 5',
      createdAt: '2026-07-24T14:57:00.000Z',
      type: 'text',
    })
    expect(p).toContain('the group conversation grp_team')
  })

  it('renders a readable placeholder for a non-text message instead of an empty body', () => {
    const p = buildPrompt({
      conversationId: 'conv_abc',
      sender: 'alice',
      text: '', // file/structured/system carry no content.text
      createdAt: '2026-07-24T14:57:00.000Z',
      type: 'file',
    })
    expect(p).toContain('a file message with no text body')
    expect(p).not.toContain('""')
  })

  it('degrades gracefully when created_at is absent', () => {
    const p = buildPrompt({ conversationId: 'conv_abc', sender: 'alice', text: 'hi' })
    expect(p).toContain('at an unknown time')
  })

  it('surfaces resolved sender identity, group name, and a mention', () => {
    const p = buildPrompt({
      conversationId: 'grp_ops',
      sender: 'bob',
      text: 'ship it?',
      createdAt: '2026-07-24T14:57:00.000Z',
      type: 'text',
      senderDisplayName: 'Bob Builder',
      senderKind: 'agent',
      groupName: 'Ops',
      mentioned: true,
    })
    expect(p).toContain('from Bob Builder (@bob)')
    expect(p).toContain('the group "Ops" (grp_ops)')
    expect(p).toContain('You were @-mentioned in this message.')
  })

  it('flags a system sender and omits the mention line when not mentioned', () => {
    const p = buildPrompt({
      conversationId: 'grp_ops',
      sender: 'chatfather',
      text: 'heads up all',
      senderDisplayName: 'Chatfather',
      senderKind: 'system',
      groupName: 'Ops',
      mentioned: false,
    })
    expect(p).toContain('from Chatfather (@chatfather), a system agent')
    expect(p).not.toContain('@-mentioned')
  })
})
