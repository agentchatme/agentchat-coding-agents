import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as http from 'node:http'
import * as os from 'node:os'
import * as path from 'node:path'

const exec = promisify(execFile)

// ─── Host isolation: one command, one agent, never a neighbour ─────────────
//
// Each coding agent on a machine is a SEPARATE AgentChat agent with its own
// account, credential, anchor and wiring. Up to 0.0.139 several commands
// silently spanned all of them:
//
//   * `register` / `login` / `recover` wrote the identity anchor for EVERY
//     host present, so registering the Claude agent rewrote Codex's AGENTS.md
//     to announce the Claude handle. That agent then told peers to DM an
//     address reaching someone else, while its own inbox sat at a handle it
//     no longer knew about — and its credential still said otherwise.
//   * `logout --platform X` ignored the flag entirely and deleted BOTH
//     agents' credentials, stripped Codex's MCP server from config.toml and
//     deleted its hooks.json.
//   * `install` wired every agent it could find in one pass.
//
// Every existing e2e created only ~/.claude, so all of it stayed green. This
// suite is the missing axis: BOTH hosts wired, distinct identities, and after
// each single-host command the OTHER host must be byte-identical.

const BIN = path.join(__dirname, '..', 'dist', 'index.js')
const CLAUDE_KEY = 'ac_live_' + 'a'.repeat(40)
const CODEX_KEY = 'ac_live_' + 'c'.repeat(40)
const FRESH_KEY = 'ac_live_' + 'f'.repeat(40)

let server: http.Server
let base: string
let fakeHome: string

beforeAll(async () => {
  if (!fs.existsSync(BIN)) throw new Error('dist/index.js missing — run `pnpm build` before tests')
  server = http.createServer((req, res) => {
    const send = (status: number, body: unknown): void => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      if (req.method === 'POST' && req.url === '/v1/register') {
        return send(200, { pending_id: 'pnd_iso', message: 'sent' })
      }
      if (req.method === 'POST' && req.url === '/v1/register/verify') {
        if (body['code'] !== '123456') return send(400, { code: 'INVALID_CODE', message: 'bad code' })
        return send(201, { agent: { handle: 'new-agent' }, api_key: FRESH_KEY })
      }
      if (req.method === 'POST' && req.url === '/v1/agents/recover') {
        return send(200, { pending_id: 'pnd_rec', message: 'sent' })
      }
      if (req.method === 'POST' && req.url === '/v1/agents/recover/verify') {
        if (body['code'] !== '654321') return send(400, { code: 'INVALID_CODE', message: 'bad code' })
        return send(200, { handle: 'claude-agent', api_key: FRESH_KEY })
      }
      if (req.method === 'GET' && req.url === '/v1/agents/me') {
        const auth = req.headers.authorization ?? ''
        // Answer as whichever agent the key belongs to, so a cross-host leak
        // shows up as the wrong handle rather than a generic pass.
        const handle = auth.includes('c'.repeat(40))
          ? 'codex-agent'
          : auth.includes('f'.repeat(40))
            ? 'new-agent'
            : 'claude-agent'
        return send(200, { handle, status: 'active' })
      }
      if (req.method === 'GET' && (req.url ?? '').startsWith('/v1/messages/sync')) {
        return send(200, [])
      }
      return send(404, { code: 'NOT_FOUND' })
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('no port')
  base = `http://127.0.0.1:${address.port}`
})

afterAll(() => server.close())

beforeEach(() => {
  fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-iso-'))
})

const claudeDir = (): string => path.join(fakeHome, '.claude')
const codexDir = (): string => path.join(fakeHome, '.codex')

interface Fixture {
  claudeIdentity?: boolean
  codexIdentity?: boolean
}

/** Both agents installed and wired, each with its OWN identity and anchor. */
function makeHosts({ claudeIdentity = true, codexIdentity = true }: Fixture = {}): void {
  fs.mkdirSync(path.join(claudeDir(), 'agentchat'), { recursive: true })
  fs.mkdirSync(path.join(codexDir(), 'agentchat'), { recursive: true })

  if (claudeIdentity) {
    fs.writeFileSync(
      path.join(claudeDir(), 'agentchat', 'credentials'),
      JSON.stringify({ api_key: CLAUDE_KEY, handle: 'claude-agent', api_base: base }),
    )
    fs.writeFileSync(
      path.join(claudeDir(), 'CLAUDE.md'),
      '# My notes\n\n<!-- agentchat:start -->\n## On AgentChat\n\nYou are **@claude-agent** on AgentChat.\n<!-- agentchat:end -->\n',
    )
  }

  if (codexIdentity) {
    fs.writeFileSync(
      path.join(codexDir(), 'agentchat', 'credentials'),
      JSON.stringify({ api_key: CODEX_KEY, handle: 'codex-agent', api_base: base }),
    )
    fs.writeFileSync(
      path.join(codexDir(), 'AGENTS.md'),
      '<!-- agentchat:start -->\n## On AgentChat\n\nYou are **@codex-agent** on AgentChat.\n<!-- agentchat:end -->\n',
    )
  }
  // Codex's real wiring footprint — what `logout` used to rip out.
  fs.writeFileSync(
    path.join(codexDir(), 'config.toml'),
    '[model]\nname = "o4"\n\n# agentchat:start\n[mcp_servers.agentchat]\ncommand = "npx"\n# agentchat:end\n',
  )
  fs.writeFileSync(
    path.join(codexDir(), 'hooks.json'),
    JSON.stringify(
      {
        hooks: {
          SessionStart: [
            { matcher: 'startup|resume', hooks: [{ type: 'command', command: 'node "/x/bin/agentchat.mjs" hook session-start --platform codex', timeout: 15 }] },
          ],
        },
      },
      null,
      2,
    ) + '\n',
  )
}

/** Content hash of every file under a directory — the "byte-identical" oracle. */
function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (d: string): void => {
    if (!fs.existsSync(d)) return
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else out[path.relative(dir, full)] = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')
    }
  }
  walk(dir)
  return out
}

async function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await exec(process.execPath, [BIN, ...args], {
      env: {
        ...process.env,
        HOME: fakeHome,
        USERPROFILE: fakeHome,
        CODEX_HOME: codexDir(),
        AGENTCHAT_HOME: '', // per-host resolution — the real user path
        AGENTCHAT_API_KEY: '',
        AGENTCHAT_API_BASE: base,
        AGENTCHAT_LOG_LEVEL: 'silent',
        // npm-less PATH: the always-on auto-install degrades to a pointer
        // instead of fetching a real daemon during tests.
        PATH: path.join(os.tmpdir(), 'agentchat-iso-no-npm'),
      },
    })
    return { code: 0, stdout, stderr }
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string }
    return { code: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' }
  }
}

describe('register never touches the other agent', () => {
  it('registering Claude Code leaves the Codex agent byte-identical', async () => {
    makeHosts({ claudeIdentity: false })
    const before = snapshot(codexDir())

    await run(['register', '--email', 'dev@example.com', '--handle', 'new-agent', '--platform', 'claude-code'])
    const done = await run(['register', '--code', '123456', '--platform', 'claude-code'])

    expect(done.code).toBe(0)
    expect(done.stdout).toContain('Registered: @new-agent for Claude Code')
    // The historical corruption, stated directly.
    expect(fs.readFileSync(path.join(codexDir(), 'AGENTS.md'), 'utf-8')).toContain('@codex-agent')
    expect(fs.readFileSync(path.join(codexDir(), 'AGENTS.md'), 'utf-8')).not.toContain('@new-agent')
    expect(snapshot(codexDir())).toEqual(before)
    // …and the host being set up DID get its anchor.
    expect(fs.readFileSync(path.join(claudeDir(), 'CLAUDE.md'), 'utf-8')).toContain('@new-agent')
  })

  it('registering Codex leaves the Claude Code agent byte-identical', async () => {
    makeHosts({ codexIdentity: false })
    const before = snapshot(claudeDir())

    await run(['register', '--email', 'dev@example.com', '--handle', 'new-agent', '--platform', 'codex'])
    const done = await run(['register', '--code', '123456', '--platform', 'codex'])

    expect(done.code).toBe(0)
    expect(done.stdout).toContain('Registered: @new-agent for Codex')
    expect(fs.readFileSync(path.join(claudeDir(), 'CLAUDE.md'), 'utf-8')).toContain('@claude-agent')
    expect(snapshot(claudeDir())).toEqual(before)
    expect(fs.readFileSync(path.join(codexDir(), 'AGENTS.md'), 'utf-8')).toContain('@new-agent')
  })

  it('one agent having an identity never blocks the other from registering', async () => {
    // Per-host identity means the gate is per-host too: Codex already being
    // registered must not stop Claude Code from getting its own account.
    makeHosts({ claudeIdentity: false })
    const started = await run([
      'register', '--email', 'dev@example.com', '--handle', 'new-agent', '--platform', 'claude-code',
    ])
    expect(started.code).toBe(0)
    expect(started.stdout).toContain('Verification code sent')
  })

  it('re-registering the SAME agent is still refused, and names that agent', async () => {
    makeHosts()
    const blocked = await run([
      'register', '--email', 'dev@example.com', '--handle', 'other', '--platform', 'codex',
    ])
    expect(blocked.code).toBe(1)
    expect(blocked.stderr).toContain('Codex already has an AgentChat identity')
  })
})

describe('login / recover never touch the other agent', () => {
  it('login on Codex leaves Claude Code byte-identical', async () => {
    makeHosts({ codexIdentity: false })
    const before = snapshot(claudeDir())
    const out = await run(['login', '--api-key', CODEX_KEY, '--platform', 'codex'])
    expect(out.code).toBe(0)
    expect(out.stdout).toContain('Signed in as @codex-agent for Codex')
    expect(snapshot(claudeDir())).toEqual(before)
  })

  it('recover on Claude Code leaves Codex byte-identical', async () => {
    makeHosts()
    const before = snapshot(codexDir())
    await run(['recover', '--email', 'dev@example.com', '--platform', 'claude-code'])
    const done = await run(['recover', '--code', '654321', '--platform', 'claude-code'])
    expect(done.code).toBe(0)
    expect(done.stdout).toContain('Recovered: @claude-agent')
    expect(snapshot(codexDir())).toEqual(before)
  })
})

describe('logout is single-agent unless --all is explicit', () => {
  it('logging out Claude Code leaves the Codex agent fully intact', async () => {
    makeHosts()
    const before = snapshot(codexDir())
    const out = await run(['logout', '--platform', 'claude-code'])

    expect(out.code).toBe(0)
    // The destructive regression, stated directly: all of this used to go.
    expect(snapshot(codexDir())).toEqual(before)
    expect(fs.existsSync(path.join(codexDir(), 'agentchat', 'credentials'))).toBe(true)
    expect(fs.existsSync(path.join(codexDir(), 'hooks.json'))).toBe(true)
    expect(fs.readFileSync(path.join(codexDir(), 'config.toml'), 'utf-8')).toContain('[mcp_servers.agentchat]')
    expect(fs.readFileSync(path.join(codexDir(), 'AGENTS.md'), 'utf-8')).toContain('@codex-agent')
    // …while Claude Code really was signed out.
    expect(fs.existsSync(path.join(claudeDir(), 'agentchat', 'credentials'))).toBe(false)
    expect(fs.readFileSync(path.join(claudeDir(), 'CLAUDE.md'), 'utf-8')).not.toContain('@claude-agent')
  })

  it('logging out Codex leaves the Claude Code agent fully intact', async () => {
    makeHosts()
    const before = snapshot(claudeDir())
    const out = await run(['logout', '--platform', 'codex'])

    expect(out.code).toBe(0)
    expect(snapshot(claudeDir())).toEqual(before)
    expect(fs.existsSync(path.join(claudeDir(), 'agentchat', 'credentials'))).toBe(true)
    // …while Codex's own wiring was removed.
    expect(fs.existsSync(path.join(codexDir(), 'agentchat', 'credentials'))).toBe(false)
    expect(fs.readFileSync(path.join(codexDir(), 'config.toml'), 'utf-8')).not.toContain('[mcp_servers.agentchat]')
  })

  it('--all is the one way to sign out of everything', async () => {
    makeHosts()
    const out = await run(['logout', '--all'])
    expect(out.code).toBe(0)
    expect(fs.existsSync(path.join(claudeDir(), 'agentchat', 'credentials'))).toBe(false)
    expect(fs.existsSync(path.join(codexDir(), 'agentchat', 'credentials'))).toBe(false)
  })

  it('a single-agent logout says the others were kept', async () => {
    makeHosts()
    const out = await run(['logout', '--platform', 'codex'])
    expect(out.stdout).toContain('Other coding agents on this machine keep their own identity')
  })
})

// Command hints are the whole support surface for a confused user; one that
// renders as a literal `${cliName()}` is worse than none. (Shipped briefly
// during this refactor when a template placeholder landed inside a
// single-quoted string — caught by hand, pinned here so it cannot recur.)
describe('every hint we print is a runnable command', () => {
  const commands = [
    ['logout', '--platform', 'codex'],
    ['logout', '--platform', 'claude-code'],
    ['logout', '--all'],
    ['status'],
    ['doctor'],
    ['register', '--email', 'dev@example.com', '--handle', 'x', '--platform', 'codex'],
    ['install', '--platform', 'codex'],
    ['--help'],
  ]
  for (const argv of commands) {
    it(`\`${argv.join(' ')}\` renders no un-interpolated placeholder`, async () => {
      makeHosts()
      const out = await run(argv)
      expect(out.stdout + out.stderr).not.toContain('${')
    })
  }
})

describe('ambiguity is refused, not guessed', () => {
  for (const command of ['register', 'login', 'recover', 'logout']) {
    it(`\`agentchat ${command}\` with two agents installed refuses and changes nothing`, async () => {
      makeHosts()
      const beforeClaude = snapshot(claudeDir())
      const beforeCodex = snapshot(codexDir())

      const out = await run([command])

      expect(out.code).toBe(1)
      expect(out.stderr).toContain('More than one coding agent')
      expect(out.stderr).toContain(`agentchat ${command} --platform claude-code`)
      expect(out.stderr).toContain(`agentchat ${command} --platform codex`)
      expect(snapshot(claudeDir())).toEqual(beforeClaude)
      expect(snapshot(codexDir())).toEqual(beforeCodex)
    })
  }
})

describe('doctor repairs a corrupted anchor without touching the healthy agent', () => {
  it('detects an anchor naming the wrong agent', async () => {
    makeHosts()
    // Exactly the state 0.0.139 and earlier produced: Codex's AGENTS.md
    // announcing the Claude agent's handle while its credential says otherwise.
    fs.writeFileSync(
      path.join(codexDir(), 'AGENTS.md'),
      '<!-- agentchat:start -->\n## On AgentChat\n\nYou are **@claude-agent** on AgentChat.\n<!-- agentchat:end -->\n',
    )
    const out = await run(['doctor'])
    expect(out.stdout).toContain('says @claude-agent but this agent is @codex-agent')
    expect(out.stdout).toContain('agentchat doctor --fix')
  })

  it('--fix rewrites it from that host’s own credentials and leaves the other alone', async () => {
    makeHosts()
    fs.writeFileSync(
      path.join(codexDir(), 'AGENTS.md'),
      '<!-- agentchat:start -->\n## On AgentChat\n\nYou are **@claude-agent** on AgentChat.\n<!-- agentchat:end -->\n',
    )
    const beforeClaude = snapshot(claudeDir())

    const out = await run(['doctor', '--fix'])

    expect(out.stdout).toContain('repaired → @codex-agent')
    const agents = fs.readFileSync(path.join(codexDir(), 'AGENTS.md'), 'utf-8')
    expect(agents).toContain('@codex-agent')
    expect(agents).not.toContain('@claude-agent')
    expect(snapshot(claudeDir())).toEqual(beforeClaude)
  })

  it('reports each agent separately with its own handle', async () => {
    makeHosts()
    const out = await run(['doctor'])
    expect(out.stdout).toContain('Claude Code/credentials')
    expect(out.stdout).toContain('@claude-agent')
    expect(out.stdout).toContain('Codex/credentials')
    expect(out.stdout).toContain('@codex-agent')
  })
})
