import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { buildArgs, codexHome, codexIdentityHome } from '../src/args.js'

const exec = promisify(execFile)

// ─── The Codex front door ───────────────────────────────────────────────────
//
// The property under test is a SAFETY property, not a convenience one: this
// entry point must be structurally incapable of acting on another coding
// agent. Every invocation is pinned to Codex's identity home and carries
// `--platform codex`, and no user input can redirect it.

describe('buildArgs', () => {
  it('defaults to install when given nothing', () => {
    expect(buildArgs([])).toEqual({ ok: true, args: ['install', '--platform', 'codex'] })
  })

  it('forces --platform codex onto every forwarded command', () => {
    expect(buildArgs(['register', '--email', 'a@b.c', '--handle', 'x'])).toEqual({
      ok: true,
      args: ['register', '--email', 'a@b.c', '--handle', 'x', '--platform', 'codex'],
    })
    expect(buildArgs(['status'])).toEqual({ ok: true, args: ['status', '--platform', 'codex'] })
    expect(buildArgs(['logout'])).toEqual({ ok: true, args: ['logout', '--platform', 'codex'] })
  })

  it('refuses a user-supplied --platform instead of silently overriding it', () => {
    for (const attempt of [
      ['install', '--platform', 'claude-code'],
      ['install', '--platform=claude-code'],
      ['logout', '--platform', 'codex'], // even the "correct" one: be unambiguous
    ]) {
      const built = buildArgs(attempt)
      expect(built.ok).toBe(false)
      if (!built.ok) expect(built.error).toContain('--platform is not accepted here')
    }
  })

  it('points a misdirected user at the OTHER front door rather than doing it for them', () => {
    const built = buildArgs(['install', '--platform', 'claude-code'])
    expect(built.ok).toBe(false)
    if (!built.ok) expect(built.error).toContain('/plugin install agentchat@agentchatme')
  })

  it('never lets --all widen the blast radius past this agent', () => {
    // `logout --all` reaches core, but AGENTCHAT_HOME + --platform codex keep
    // it scoped; this asserts the flag is at least forwarded verbatim so the
    // behaviour is core's single, tested implementation rather than a second one.
    expect(buildArgs(['logout', '--all'])).toEqual({
      ok: true,
      args: ['logout', '--all', '--platform', 'codex'],
    })
  })
})

describe('identity home resolution', () => {
  let saved: string | undefined
  beforeEach(() => {
    saved = process.env['CODEX_HOME']
  })
  afterEach(() => {
    if (saved === undefined) delete process.env['CODEX_HOME']
    else process.env['CODEX_HOME'] = saved
  })

  it('honours CODEX_HOME', () => {
    process.env['CODEX_HOME'] = '/tmp/custom-codex'
    expect(codexHome()).toBe(path.resolve('/tmp/custom-codex'))
    expect(codexIdentityHome()).toBe(path.join(path.resolve('/tmp/custom-codex'), 'agentchat'))
  })

  it('falls back to ~/.codex, matching the core CLI', () => {
    delete process.env['CODEX_HOME']
    expect(codexHome()).toBe(path.join(os.homedir(), '.codex'))
    expect(codexIdentityHome()).toBe(path.join(os.homedir(), '.codex', 'agentchat'))
  })
})

// End-to-end against the built bin with a STUBBED engine, so we observe
// exactly what the real engine would have been handed.
describe('the built bin hands the engine a Codex-scoped invocation', () => {
  const built = path.join(__dirname, '..', 'dist', 'index.js')
  let sandbox: string
  let stubbedBin: string

  beforeEach(() => {
    if (!fs.existsSync(built)) throw new Error('dist/index.js missing — run `pnpm build` before tests')
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-frontdoor-'))
    // cliBundlePath() resolves as a sibling of the running module, so copying
    // the bin next to a stub engine intercepts the delegation.
    stubbedBin = path.join(sandbox, 'index.js')
    fs.copyFileSync(built, stubbedBin)
    fs.writeFileSync(
      path.join(sandbox, 'agentchat-cli.mjs'),
      'console.log(JSON.stringify({ argv: process.argv.slice(2), home: process.env.AGENTCHAT_HOME }))\n',
    )
  })

  afterEach(() => fs.rmSync(sandbox, { recursive: true, force: true }))

  const run = async (args: string[], env: Record<string, string> = {}) => {
    const { stdout } = await exec(process.execPath, [stubbedBin, ...args], {
      env: { ...process.env, CODEX_HOME: path.join(sandbox, '.codex'), ...env },
    })
    return JSON.parse(stdout) as { argv: string[]; home: string }
  }

  it('bare invocation installs, scoped to the Codex identity home', async () => {
    const seen = await run([])
    expect(seen.argv).toEqual(['install', '--platform', 'codex'])
    expect(seen.home).toBe(path.join(sandbox, '.codex', 'agentchat'))
  })

  it('a forwarded command keeps its own flags and gains the platform', async () => {
    const seen = await run(['register', '--email', 'a@b.c', '--handle', 'my-agent'])
    expect(seen.argv).toEqual(['register', '--email', 'a@b.c', '--handle', 'my-agent', '--platform', 'codex'])
  })

  it('the identity home follows CODEX_HOME, never ~/.claude', async () => {
    const elsewhere = path.join(sandbox, 'elsewhere')
    const seen = await run(['status'], { CODEX_HOME: elsewhere })
    expect(seen.home).toBe(path.join(elsewhere, 'agentchat'))
    expect(seen.home).not.toContain('.claude')
  })

  it('exits non-zero without invoking the engine when --platform is supplied', async () => {
    await expect(run(['install', '--platform', 'claude-code'])).rejects.toThrow()
  })
})
