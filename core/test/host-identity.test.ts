import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { hostHome, bindHostHome, agentchatHome } from '../src/lib/paths.js'
import { resolveIdentity, readCredentialsFileAt } from '../src/lib/credentials.js'

// The core promise of the per-host design: two coding agents on ONE machine
// are TWO distinct AgentChat identities (so they can message each other),
// not one shared account.

let home: string
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-hostid-'))
  for (const k of ['HOME', 'CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'AGENTCHAT_HOME', 'AGENTCHAT_API_KEY']) {
    saved[k] = process.env[k]
    delete process.env[k]
  }
  process.env['HOME'] = home
  process.env['CLAUDE_CONFIG_DIR'] = path.join(home, '.claude')
  process.env['CODEX_HOME'] = path.join(home, '.codex')
})

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  fs.rmSync(home, { recursive: true, force: true })
})

function writeIdentity(homeDir: string, handle: string): void {
  fs.mkdirSync(homeDir, { recursive: true })
  fs.writeFileSync(
    path.join(homeDir, 'credentials'),
    JSON.stringify({ api_key: 'ac_live_' + handle.padEnd(32, 'x'), handle, api_base: 'https://api.agentchat.me' }),
  )
}

describe('per-host identity homes', () => {
  it('claude and codex resolve to DIFFERENT scoped homes', () => {
    const claude = hostHome('claude-code')
    const codex = hostHome('codex')
    expect(claude).toBe(path.join(home, '.claude', 'agentchat'))
    expect(codex).toBe(path.join(home, '.codex', 'agentchat'))
    expect(claude).not.toBe(codex)
  })

  it('two agents on one machine are two distinct identities', () => {
    writeIdentity(hostHome('claude-code'), 'me-claude')
    writeIdentity(hostHome('codex'), 'me-codex')

    // Each host reads its OWN handle — they are separate peers.
    expect(readCredentialsFileAt(hostHome('claude-code'))?.handle).toBe('me-claude')
    expect(readCredentialsFileAt(hostHome('codex'))?.handle).toBe('me-codex')
  })

  it('bindHostHome makes resolveIdentity return the host identity', () => {
    writeIdentity(hostHome('claude-code'), 'me-claude')
    writeIdentity(hostHome('codex'), 'me-codex')

    bindHostHome('claude-code')
    expect(resolveIdentity()?.handle).toBe('me-claude')

    delete process.env['AGENTCHAT_HOME']
    bindHostHome('codex')
    expect(resolveIdentity()?.handle).toBe('me-codex')
  })

  it('an explicit AGENTCHAT_HOME overrides the host home (power-user / test escape hatch)', () => {
    const custom = path.join(home, 'custom')
    writeIdentity(custom, 'me-custom')
    process.env['AGENTCHAT_HOME'] = custom
    // bindHostHome respects the existing AGENTCHAT_HOME rather than clobbering it.
    expect(bindHostHome('codex')).toBe(custom)
    expect(resolveIdentity()?.handle).toBe('me-custom')
  })

  it('with no host and no env, resolves the legacy machine-global home', () => {
    // (default agentchatHome ~/.agentchat — the migration source)
    expect(agentchatHome()).toBe(path.join(home, '.agentchat'))
  })
})
