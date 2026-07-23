import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { binaryOnPath, detectPlatforms, runInstall } from '../src/commands/install.js'

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

  it('points to per-host registration when no identity, and shows the handle when present', async () => {
    fakeBinary('claude')
    const logs: string[] = []
    vi.mocked(console.log).mockImplementation((msg: unknown) => logs.push(String(msg)))
    await runInstall({ env: { PATH: fakeBinDir } as NodeJS.ProcessEnv, homedir: home, run: () => 0 })
    expect(logs.join('\n')).toContain('agentchat register --platform claude-code')

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
