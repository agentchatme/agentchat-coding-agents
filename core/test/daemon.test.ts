import { beforeEach, describe, expect, it, vi } from 'vitest'

// tryInstallDaemon is the best-effort always-on setup that register/login/recover
// call so "on by default" needs no second command. It orchestrates two steps —
// fetch the runtime (npm, skipped if already present) then install the per-host
// service — and must map both to a plain {ok}|{ok:false,detail} without throwing.
// We mock child_process + the entrypoint-existence probe to drive each branch.

const { spawnSyncMock, state } = vi.hoisted(() => ({
  spawnSyncMock: vi.fn(),
  state: { entryExists: false },
}))

vi.mock('node:child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSyncMock(...args),
}))
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    // The only path tryInstallDaemon probes is the daemon entrypoint (…/index.js).
    existsSync: (p: fs.PathLike) =>
      String(p).endsWith('index.js') ? state.entryExists : actual.existsSync(p),
    mkdirSync: () => undefined,
  }
})

import type * as fs from 'node:fs'
import { tryInstallDaemon } from '../src/commands/daemon.js'

beforeEach(() => {
  spawnSyncMock.mockReset()
  state.entryExists = false
})

describe('tryInstallDaemon', () => {
  it('runtime already present → installs the service only, no npm fetch', () => {
    state.entryExists = true
    spawnSyncMock.mockReturnValue({ status: 0 })

    const res = tryInstallDaemon('claude-code', '/home/x/.claude/agentchat')

    expect(res.ok).toBe(true)
    expect(spawnSyncMock).toHaveBeenCalledTimes(1) // npm install skipped
    const args = spawnSyncMock.mock.calls[0][1] as string[]
    expect(args).toEqual(
      expect.arrayContaining(['install', '--runtime', 'claude-code', '--home', '/home/x/.claude/agentchat']),
    )
  })

  it('runtime missing → fetches the runtime, then installs the service', () => {
    spawnSyncMock.mockImplementation((cmd: string) => {
      if (cmd === 'npm') {
        state.entryExists = true // fetch succeeded → entrypoint now exists
        return { status: 0 }
      }
      return { status: 0 } // service install
    })

    const res = tryInstallDaemon('codex', '/home/x/.codex/agentchat')

    expect(res.ok).toBe(true)
    expect(spawnSyncMock).toHaveBeenCalledTimes(2) // npm + service
  })

  it('runtime fetch fails → { ok:false }, and the service is never touched', () => {
    spawnSyncMock.mockImplementation((cmd: string) =>
      cmd === 'npm' ? { status: 1, stderr: 'network boom' } : { status: 0 },
    )

    const res = tryInstallDaemon('claude-code', '/h')

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.detail).toContain('network boom')
    expect(spawnSyncMock).toHaveBeenCalledTimes(1) // stopped before the service install
  })

  it('service install fails → { ok:false } carrying the failure detail', () => {
    state.entryExists = true
    spawnSyncMock.mockReturnValue({ status: 1, stderr: 'systemd said no' })

    const res = tryInstallDaemon('claude-code', '/h')

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.detail).toContain('systemd said no')
  })

  it('spawn error (no npm on PATH) → { ok:false }, never throws', () => {
    state.entryExists = false
    spawnSyncMock.mockReturnValue({ status: null, error: new Error('spawn npm ENOENT') })

    const res = tryInstallDaemon('claude-code', '/h')

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.detail.length).toBeGreaterThan(0)
  })
})
