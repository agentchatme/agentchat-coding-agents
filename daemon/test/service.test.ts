import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { planForTest } from '../src/service.js'

// A systemd/launchd service does NOT inherit the login shell's PATH, so it
// can't find claude/codex/npx unless we capture PATH into the unit. This bit
// once (the service restart-looped on "claude CLI not found"); guard it.

const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of ['PATH', 'CODEX_HOME', 'CLAUDE_CONFIG_DIR']) saved[k] = process.env[k]
})
afterEach(() => {
  for (const k of ['PATH', 'CODEX_HOME', 'CLAUDE_CONFIG_DIR']) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe('service plan env capture', () => {
  it('always captures PATH so the service can find claude/codex/npx', () => {
    process.env['PATH'] = '/home/me/.local/bin:/usr/bin'
    const p = planForTest({ runtime: 'claude-code', home: '/h' })
    expect(p.env['PATH']).toBe('/home/me/.local/bin:/usr/bin')
  })

  it('captures CLAUDE_CONFIG_DIR for the claude-code runtime', () => {
    process.env['CLAUDE_CONFIG_DIR'] = '/cfg'
    const p = planForTest({ runtime: 'claude-code', home: '/h' })
    expect(p.env['CLAUDE_CONFIG_DIR']).toBe('/cfg')
  })

  it('captures CODEX_HOME for the codex runtime (not CLAUDE_CONFIG_DIR)', () => {
    process.env['CODEX_HOME'] = '/codex'
    process.env['CLAUDE_CONFIG_DIR'] = '/cfg'
    const p = planForTest({ runtime: 'codex', home: '/h' })
    expect(p.env['CODEX_HOME']).toBe('/codex')
    expect(p.env['CLAUDE_CONFIG_DIR']).toBeUndefined()
  })

  it('labels the unit by runtime so codex + claude-code coexist', () => {
    expect(planForTest({ runtime: 'codex', home: '/h' }).label).toBe('agentchatd-codex')
    expect(planForTest({ runtime: 'claude-code', home: '/h' }).label).toBe('agentchatd-claude-code')
  })
})
