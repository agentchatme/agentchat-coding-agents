import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { resolveHost, binaryOnPath, detectPlatforms, runInstall } from '../src/commands/install.js'

let home: string
let fakeBinDir: string
let savedHome: string | undefined

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-install-'))
  fakeBinDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-bin-'))
  process.env['AGENTCHAT_HOME'] = home // keep resolveIdentity off the real machine
  process.env['CODEX_HOME'] = path.join(home, '.codex') // codex host home off the real ~/.codex
  savedHome = process.env['HOME']
  process.env['HOME'] = home // claude host home (os.homedir) off the real ~/.claude
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  delete process.env['AGENTCHAT_HOME']
  delete process.env['CODEX_HOME']
  if (savedHome === undefined) delete process.env['HOME']
  else process.env['HOME'] = savedHome
  vi.restoreAllMocks()
  fs.rmSync(home, { recursive: true, force: true })
  fs.rmSync(fakeBinDir, { recursive: true, force: true })
})

function fakeBinary(name: string): void {
  fs.writeFileSync(path.join(fakeBinDir, name), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
}

describe('detection', () => {
  it('finds a platform via its binary on PATH', () => {
    fakeBinary('claude')
    const env = { PATH: fakeBinDir } as NodeJS.ProcessEnv
    expect(binaryOnPath('claude', env)).toBe(true)
    expect(detectPlatforms(env, home).map((p) => p.key)).toEqual(['claude-code'])
  })

  it('finds a platform via its config dir when the binary is not on PATH', () => {
    fs.mkdirSync(path.join(home, '.codex'))
    const env = { PATH: fakeBinDir } as NodeJS.ProcessEnv
    expect(detectPlatforms(env, home).map((p) => p.key)).toEqual(['codex'])
  })

  it('detects nothing on a bare machine', () => {
    expect(detectPlatforms({ PATH: fakeBinDir } as NodeJS.ProcessEnv, home)).toEqual([])
  })
})

describe('runInstall', () => {
  it('wires Claude Code through the official CLI commands, in order', async () => {
    fakeBinary('claude')
    const calls: string[][] = []
    const code = await runInstall({
      env: { PATH: fakeBinDir } as NodeJS.ProcessEnv,
      homedir: home,
      run: (cmd, args) => {
        calls.push([cmd, ...args])
        return 0
      },
    })
    expect(code).toBe(0)
    expect(calls).toEqual([
      ['claude', 'plugin', 'marketplace', 'add', 'agentchatme/agentchat-coding-agents'],
      ['claude', 'plugin', 'install', 'agentchat@agentchatme'],
    ])
  })

  it('falls back to printed slash commands when the claude CLI rejects, and exits 1', async () => {
    fakeBinary('claude')
    const logs: string[] = []
    vi.mocked(console.log).mockImplementation((msg: unknown) => logs.push(String(msg)))
    const code = await runInstall({
      env: { PATH: fakeBinDir } as NodeJS.ProcessEnv,
      homedir: home,
      run: () => 1,
    })
    expect(code).toBe(1)
    const output = logs.join('\n')
    expect(output).toContain('/plugin marketplace add agentchatme/agentchat-coding-agents')
    expect(output).toContain('/plugin install agentchat@agentchatme')
  })

  it('does not attempt install when marketplace add fails (never half-wires)', async () => {
    fakeBinary('claude')
    const calls: string[][] = []
    await runInstall({
      env: { PATH: fakeBinDir } as NodeJS.ProcessEnv,
      homedir: home,
      run: (cmd, args) => {
        calls.push([cmd, ...args])
        return 1
      },
    })
    expect(calls).toHaveLength(1)
  })

  it('wires Codex directly (no platform CLI) and reports Cursor as next-release', async () => {
    fakeBinary('codex')
    fs.mkdirSync(path.join(home, '.cursor'))
    const logs: string[] = []
    vi.mocked(console.log).mockImplementation((msg: unknown) => logs.push(String(msg)))
    const calls: string[][] = []
    const code = await runInstall({
      env: { PATH: fakeBinDir } as NodeJS.ProcessEnv,
      homedir: home,
      run: (cmd, args) => {
        calls.push([cmd, ...args])
        return 0
      },
    })
    expect(code).toBe(0)
    expect(calls).toHaveLength(0) // Codex is direct-config, not a platform-CLI call
    const output = logs.join('\n')
    expect(output).toContain('Codex: wired')
    // config actually landed in the isolated CODEX_HOME
    expect(fs.existsSync(path.join(home, '.codex', 'config.toml'))).toBe(true)
    expect(fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf-8')).toContain(
      '[mcp_servers.agentchat]',
    )
    expect(output).toContain('Cursor: detected')
    expect(output).toContain('next release')
  })

  it('exits 1 with guidance when no platform is found', async () => {
    const logs: string[] = []
    vi.mocked(console.log).mockImplementation((msg: unknown) => logs.push(String(msg)))
    const code = await runInstall({
      env: { PATH: fakeBinDir } as NodeJS.ProcessEnv,
      homedir: home,
      run: () => 0,
    })
    expect(code).toBe(1)
    expect(logs.join('\n')).toContain('No supported coding agent found')
  })

  it('gives a clean single-agent registration hint with NO --platform jargon', async () => {
    fakeBinary('claude')
    const logs: string[] = []
    vi.mocked(console.log).mockImplementation((msg: unknown) => logs.push(String(msg)))
    await runInstall({ env: { PATH: fakeBinDir } as NodeJS.ProcessEnv, homedir: home, run: () => 0 })
    const out = logs.join('\n')
    expect(out).toContain('Last step — give Claude Code its @handle')
    expect(out).toContain('agentchat register --email') // clean command; platform is auto-detected
    expect(out).not.toContain('--platform') // the whole point — no platform choice leaked

    logs.length = 0
    // Credential lives in the CLAUDE host home now, not a machine-global file.
    const claudeHome = path.join(home, '.claude', 'agentchat')
    fs.mkdirSync(claudeHome, { recursive: true })
    fs.writeFileSync(
      path.join(claudeHome, 'credentials'),
      JSON.stringify({ api_key: 'ac_live_' + 'x'.repeat(32), handle: 'demo' }),
    )
    await runInstall({ env: { PATH: fakeBinDir } as NodeJS.ProcessEnv, homedir: home, run: () => 0 })
    expect(logs.join('\n')).toContain('Signed in: Claude Code → @demo')
  })
})

// ─── One install = one agent ────────────────────────────────────────────────
//
// The regression this suite exists for: `agentchat install` used to wire EVERY
// coding agent it could find in a single pass. A user setting up Codex silently
// got their Claude Code rewired too, with no prompt and no way to tell which
// agent the following registration belonged to.
describe('runInstall never fans out across agents', () => {
  const both = (): NodeJS.ProcessEnv => {
    fakeBinary('claude')
    fakeBinary('codex')
    return { PATH: fakeBinDir } as NodeJS.ProcessEnv
  }

  it('refuses to guess when two agents are installed, and wires NOTHING', async () => {
    const errs: string[] = []
    vi.spyOn(console, 'error').mockImplementation((msg: unknown) => errs.push(String(msg)))
    const calls: string[][] = []
    const code = await runInstall({
      env: both(),
      homedir: home,
      run: (cmd, args) => {
        calls.push([cmd, ...args])
        return 0
      },
    })
    expect(code).toBe(1)
    const out = errs.join('\n')
    expect(out).toContain('More than one coding agent')
    expect(out).toContain('agentchat install --platform claude-code')
    expect(out).toContain('agentchat install --platform codex')
    // Nothing was touched: no claude CLI call, no codex config written.
    expect(calls).toHaveLength(0)
    expect(fs.existsSync(path.join(home, '.codex', 'config.toml'))).toBe(false)
  })

  it('--platform codex wires ONLY Codex — the claude CLI is never invoked', async () => {
    const calls: string[][] = []
    const code = await runInstall({
      env: both(),
      homedir: home,
      platform: 'codex',
      run: (cmd, args) => {
        calls.push([cmd, ...args])
        return 0
      },
    })
    expect(code).toBe(0)
    expect(calls).toHaveLength(0) // Claude Code was NOT rewired
    expect(fs.existsSync(path.join(home, '.codex', 'config.toml'))).toBe(true)
  })

  it('--platform claude-code wires ONLY Claude Code — no codex config appears', async () => {
    const calls: string[][] = []
    const code = await runInstall({
      env: both(),
      homedir: home,
      platform: 'claude-code',
      run: (cmd, args) => {
        calls.push([cmd, ...args])
        return 0
      },
    })
    expect(code).toBe(0)
    expect(calls.map((c) => c[0])).toEqual(['claude', 'claude'])
    expect(fs.existsSync(path.join(home, '.codex', 'config.toml'))).toBe(false)
    expect(fs.existsSync(path.join(home, '.codex', 'hooks.json'))).toBe(false)
  })

  it('names the untouched agent so the second setup is a deliberate act', async () => {
    const logs: string[] = []
    vi.mocked(console.log).mockImplementation((msg: unknown) => logs.push(String(msg)))
    await runInstall({ env: both(), homedir: home, platform: 'codex', run: () => 0 })
    const out = logs.join('\n')
    expect(out).toContain('Also installed here: Claude Code — left untouched.')
    // Point at the OTHER agent's own front door — the two setups are separate
    // flows end to end, not two modes of one command.
    expect(out).toContain('/plugin marketplace add agentchatme/agentchat-coding-agents')
    expect(out).toContain('/plugin install agentchat@agentchatme')
    // With a sibling agent present the hint MUST be explicit about which one.
    expect(out).toContain('agentchat register --platform codex --email')
  })

  it('rejects a --platform that is not installed rather than falling back', async () => {
    fakeBinary('codex')
    const errs: string[] = []
    vi.spyOn(console, 'error').mockImplementation((msg: unknown) => errs.push(String(msg)))
    const code = await runInstall({
      env: { PATH: fakeBinDir } as NodeJS.ProcessEnv,
      homedir: home,
      platform: 'claude-code',
      run: () => 0,
    })
    expect(code).toBe(1)
    expect(errs.join('\n')).toContain('Claude Code was not found')
  })
})

describe('resolveHost (what lets users drop --platform, without guessing)', () => {
  const env = (): NodeJS.ProcessEnv => ({ PATH: fakeBinDir }) as NodeJS.ProcessEnv

  it('an explicit --platform always wins over detection', () => {
    fakeBinary('claude') // claude is present…
    expect(resolveHost('codex', env(), home)).toEqual({ ok: true, platform: 'codex' }) // …but the flag wins
  })

  it('ignores an invalid explicit value and falls back to detection', () => {
    fakeBinary('codex')
    expect(resolveHost('nonsense', env(), home)).toEqual({ ok: true, platform: 'codex' })
  })

  it('exactly one agent installed → that one (no flag needed)', () => {
    fakeBinary('codex')
    expect(resolveHost(undefined, env(), home)).toEqual({ ok: true, platform: 'codex' })
  })

  it('claude-code only → claude-code', () => {
    fakeBinary('claude')
    expect(resolveHost(undefined, env(), home)).toEqual({ ok: true, platform: 'claude-code' })
  })

  // The regression: this used to silently resolve to claude-code, so a Codex
  // user's bare `agentchat register` wrote a credential into the Claude host
  // home and left Codex unregistered. Two agents = two accounts; refuse.
  it('both installed → AMBIGUOUS, never a silent pick', () => {
    fakeBinary('claude')
    fakeBinary('codex')
    expect(resolveHost(undefined, env(), home)).toEqual({
      ok: false,
      candidates: ['claude-code', 'codex'],
    })
  })

  it('nothing detected → safe default of claude-code (scopes to ~/.claude/agentchat)', () => {
    expect(resolveHost(undefined, env(), home)).toEqual({ ok: true, platform: 'claude-code' })
  })

  it('cursor is excluded (no identity support yet) → never makes it ambiguous', () => {
    fakeBinary('cursor-agent')
    fakeBinary('codex')
    expect(resolveHost(undefined, env(), home)).toEqual({ ok: true, platform: 'codex' })
  })
})
