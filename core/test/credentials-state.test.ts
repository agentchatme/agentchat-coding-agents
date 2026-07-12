import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  resolveIdentity,
  writeCredentials,
  readCredentialsFile,
  clearCredentials,
  writePending,
  readPending,
  DEFAULT_API_BASE,
} from '../src/lib/credentials.js'
import { credentialsPath } from '../src/lib/paths.js'
import { getContinuations, recordContinuation } from '../src/lib/state.js'
import { statePath } from '../src/lib/paths.js'

const KEY = 'ac_live_0123456789abcdef0123456789abcdef'
let home: string

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-home-'))
  process.env['AGENTCHAT_HOME'] = home
  delete process.env['AGENTCHAT_API_KEY']
  delete process.env['AGENTCHAT_API_BASE']
})

afterEach(() => {
  delete process.env['AGENTCHAT_HOME']
  delete process.env['AGENTCHAT_API_KEY']
  delete process.env['AGENTCHAT_API_BASE']
  fs.rmSync(home, { recursive: true, force: true })
})

describe('credentials', () => {
  it('resolves nothing on a fresh machine', () => {
    expect(resolveIdentity()).toBeNull()
  })

  it('round-trips the credentials file with 0600 permissions', () => {
    writeCredentials({ api_key: KEY, handle: 'demo-agent' })
    if (process.platform !== 'win32') {
      // Windows has no POSIX mode bits — stat reports 0o666 regardless of chmod.
      const mode = fs.statSync(credentialsPath()).mode & 0o777
      expect(mode).toBe(0o600)
    }
    const identity = resolveIdentity()
    expect(identity).toMatchObject({
      apiKey: KEY,
      handle: 'demo-agent',
      apiBase: DEFAULT_API_BASE,
      source: 'file',
    })
  })

  it('env var beats the file', () => {
    writeCredentials({ api_key: KEY, handle: 'file-agent' })
    process.env['AGENTCHAT_API_KEY'] = 'ac_test_ffffffffffffffffffffffffffffffff'
    const identity = resolveIdentity()
    expect(identity?.source).toBe('env')
    expect(identity?.apiKey).toContain('ac_test_')
    // handle still comes from the file when available — best identity we have
    expect(identity?.handle).toBe('file-agent')
  })

  it('honors api_base from env over file', () => {
    writeCredentials({ api_key: KEY, handle: 'demo', api_base: 'https://staging.example.com' })
    process.env['AGENTCHAT_API_BASE'] = 'https://override.example.com'
    expect(resolveIdentity()?.apiBase).toBe('https://override.example.com')
  })

  it('treats a corrupt credentials file as absent instead of throwing', () => {
    fs.mkdirSync(home, { recursive: true })
    fs.writeFileSync(credentialsPath(), '{not json')
    expect(readCredentialsFile()).toBeNull()
    expect(resolveIdentity()).toBeNull()
  })

  it('clearCredentials removes credentials and pending', () => {
    writeCredentials({ api_key: KEY, handle: 'demo' })
    writePending({
      pending_id: 'pnd_x',
      email: 'a@b.co',
      handle: 'demo',
      created_at: new Date().toISOString(),
    })
    expect(clearCredentials()).toBe(true)
    expect(resolveIdentity()).toBeNull()
    expect(readPending()).toBeNull()
  })
})

describe('hook state', () => {
  it('counts continuations per session key', () => {
    expect(getContinuations('claude-code:s1')).toBe(0)
    expect(recordContinuation('claude-code:s1')).toBe(1)
    expect(recordContinuation('claude-code:s1')).toBe(2)
    expect(getContinuations('claude-code:s1')).toBe(2)
    expect(getContinuations('claude-code:other')).toBe(0)
  })

  it('prunes entries older than 48h on write', () => {
    const old = new Date(Date.now() - 72 * 3600 * 1000)
    recordContinuation('codex:stale', old)
    recordContinuation('codex:fresh')
    const raw = JSON.parse(fs.readFileSync(statePath(), 'utf-8'))
    expect(Object.keys(raw.sessions)).toContain('codex:fresh')
    expect(Object.keys(raw.sessions)).not.toContain('codex:stale')
  })

  it('recovers from a corrupt state file', () => {
    fs.mkdirSync(home, { recursive: true })
    fs.writeFileSync(statePath(), 'garbage')
    expect(getContinuations('cursor:x')).toBe(0)
    expect(recordContinuation('cursor:x')).toBe(1)
  })
})
