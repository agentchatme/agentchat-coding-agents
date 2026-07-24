import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { alwaysOnHealth, markAlwaysOnWanted, clearAlwaysOnWanted } from '../src/commands/daemon.js'

// The signal the session-start hook acts on: intent marker (did the user opt into
// always-on?) × heartbeat freshness (is the daemon actually beating?). Real files,
// real mtimes — this is the whole point of the mechanism, so no mocks.

let home: string
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'aoh-'))
})
afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true })
})

/** Write the heartbeat file, optionally backdating its mtime by `agoMs`. */
function beat(agoMs = 0): void {
  const p = path.join(home, 'daemon.heartbeat')
  fs.writeFileSync(p, String(Date.now()))
  if (agoMs > 0) {
    const t = (Date.now() - agoMs) / 1000
    fs.utimesSync(p, t, t)
  }
}

describe('alwaysOnHealth', () => {
  it('no intent marker → not wanted, treated as healthy (never nag a session-only user)', () => {
    expect(alwaysOnHealth(home)).toEqual({ wanted: false, healthy: true })
    beat(999 * 60_000) // even a wildly stale beacon is ignored without intent
    expect(alwaysOnHealth(home)).toEqual({ wanted: false, healthy: true })
  })

  it('wanted + fresh heartbeat → healthy', () => {
    markAlwaysOnWanted(home)
    beat(0)
    expect(alwaysOnHealth(home)).toEqual({ wanted: true, healthy: true })
  })

  it('wanted + heartbeat inside the 3-min window → still healthy (absorbs a brief reconnect)', () => {
    markAlwaysOnWanted(home)
    beat(60_000) // 1 min old
    expect(alwaysOnHealth(home)).toEqual({ wanted: true, healthy: true })
  })

  it('wanted + stale heartbeat (>3 min) → down', () => {
    markAlwaysOnWanted(home)
    beat(5 * 60_000)
    expect(alwaysOnHealth(home)).toEqual({ wanted: true, healthy: false })
  })

  it('wanted + no heartbeat at all → down (never started, or long dead)', () => {
    markAlwaysOnWanted(home)
    expect(alwaysOnHealth(home)).toEqual({ wanted: true, healthy: false })
  })

  it('disable clears the intent → no nag, even with a stale beacon lingering', () => {
    markAlwaysOnWanted(home)
    beat(10 * 60_000)
    clearAlwaysOnWanted(home)
    expect(alwaysOnHealth(home)).toEqual({ wanted: false, healthy: true })
  })
})
