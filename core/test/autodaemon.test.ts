import { beforeEach, describe, expect, it, vi } from 'vitest'

// autoDaemon is the glue that makes "always-on, on by default" one motion:
// register/login/recover call it right after writing credentials. Here we stub
// the actual install (covered separately in daemon.test.ts) and assert only the
// branching + the message the agent/user sees.

const tryInstallDaemonMock = vi.hoisted(() => vi.fn())
vi.mock('../src/commands/daemon.js', () => ({ tryInstallDaemon: tryInstallDaemonMock }))

import { autoDaemon } from '../src/commands/identity.js'

beforeEach(() => {
  tryInstallDaemonMock.mockReset()
  process.env['AGENTCHAT_HOME'] = '/tmp/probe/.claude/agentchat'
})

describe('autoDaemon', () => {
  it('no --platform → manual pointer, never attempts an install', () => {
    const out = autoDaemon(undefined).join('\n')
    expect(out).toContain('daemon install')
    expect(out).toContain('on by default')
    expect(tryInstallDaemonMock).not.toHaveBeenCalled()
  })

  it('cursor (no daemon yet) → manual pointer, never attempts an install', () => {
    autoDaemon('cursor')
    expect(tryInstallDaemonMock).not.toHaveBeenCalled()
  })

  it('claude-code + success → past-tense confirmation, targets the bound home', () => {
    tryInstallDaemonMock.mockReturnValue({ ok: true })
    const out = autoDaemon('claude-code').join('\n')
    expect(out).toContain('Always-on is ON')
    expect(out).toContain('daemon disable --platform claude-code')
    expect(tryInstallDaemonMock).toHaveBeenCalledWith(
      'claude-code',
      expect.stringContaining('.claude/agentchat'),
    )
  })

  it('claude-code + failure → manual fallback carrying the reason (never throws)', () => {
    tryInstallDaemonMock.mockReturnValue({ ok: false, detail: 'npm install failed: network boom' })
    const out = autoDaemon('claude-code').join('\n')
    expect(out).toContain("didn't auto-start")
    expect(out).toContain('network boom')
    expect(out).toContain('daemon install --platform claude-code')
  })
})
