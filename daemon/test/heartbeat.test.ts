import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { Daemon } from '../src/daemon.js'
import type { AgentWsClient } from '../src/ws-client.js'
import type { RuntimeAdapter } from '../src/adapters/types.js'
import type { DaemonConfig } from '../src/config.js'

// A fake socket: an EventEmitter with the surface Daemon touches (start/stop/
// connected). Tests drive 'ready' and flip `connected` to prove the heartbeat is
// written while live and left to go stale when not.
class FakeWs extends EventEmitter {
  connected = false
  start = vi.fn()
  stop = vi.fn()
}

const adapter = {
  name: 'test',
  preflight: async () => ({ ok: true }),
  runTurn: async () => ({}),
} as unknown as RuntimeAdapter

let home: string
const cfg = (): DaemonConfig => ({
  apiKey: 'ac_live_' + 'x'.repeat(40),
  handle: 'beater',
  apiBase: 'http://127.0.0.1:1',
  wsUrl: 'ws://127.0.0.1:1/v1/ws',
  runtime: 'claude-code',
  home,
  runtimeHome: home,
  workdir: home,
})
const beatPath = (): string => path.join(home, 'daemon.heartbeat')

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-'))
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  fs.rmSync(home, { recursive: true, force: true })
})

describe('daemon heartbeat', () => {
  it('stamps <home>/daemon.heartbeat the moment the socket goes ready', async () => {
    const ws = new FakeWs()
    const d = new Daemon(cfg(), adapter, ws as unknown as AgentWsClient)
    await d.start()

    expect(fs.existsSync(beatPath())).toBe(false) // nothing until connected
    ws.connected = true
    ws.emit('ready')
    // This filename MUST match core's reader (alwaysOnHealth) or the whole
    // feature silently no-ops — that's what this assertion guards.
    expect(fs.existsSync(beatPath())).toBe(true)
    d.stop()
  })

  it('the interval beats only while connected — a dropped socket goes stale on purpose', async () => {
    const ws = new FakeWs()
    const d = new Daemon(cfg(), adapter, ws as unknown as AgentWsClient)
    await d.start()

    ws.connected = true
    ws.emit('ready')
    fs.rmSync(beatPath())
    vi.advanceTimersByTime(30_000)
    expect(fs.existsSync(beatPath())).toBe(true) // beat while connected

    ws.connected = false
    fs.rmSync(beatPath())
    vi.advanceTimersByTime(90_000)
    expect(fs.existsSync(beatPath())).toBe(false) // no beat while down → reader sees "down"
    d.stop()
  })
})
