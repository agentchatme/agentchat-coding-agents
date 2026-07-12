import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as fs from 'node:fs'
import * as http from 'node:http'
import * as os from 'node:os'
import * as path from 'node:path'

const exec = promisify(execFile)

// ─── End-to-end: register / recover wizard against a fake API ──────────────
//
// Drives the real bin exactly as the coding agent does (flag mode, no TTY).
// The fake server implements the production registration/recovery contract:
// POST /v1/register → {pending_id}; /verify → 201 {agent, api_key};
// /v1/agents/recover(/verify) for re-keying. HOME is redirected so anchor
// auto-install can never touch the real machine.

const BIN = path.join(__dirname, '..', 'dist', 'index.js')
const NEW_KEY = 'ac_live_' + 'a'.repeat(40)
const RECOVERED_KEY = 'ac_live_' + 'b'.repeat(40)

let server: http.Server
let base: string
let home: string
let fakeHome: string

beforeAll(async () => {
  if (!fs.existsSync(BIN)) throw new Error('dist/index.js missing — run `pnpm build` before tests')
  server = http.createServer((req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : {}
      if (req.method === 'POST' && req.url === '/v1/register') {
        if (body.handle === 'taken-handle') return send(409, { code: 'HANDLE_TAKEN', message: 'taken' })
        return send(200, { pending_id: 'pnd_e2e', message: 'sent' })
      }
      if (req.method === 'POST' && req.url === '/v1/register/verify') {
        if (body.code !== '123456') return send(400, { code: 'INVALID_CODE', message: 'bad code' })
        return send(201, { agent: { handle: body.pending_id === 'pnd_e2e' ? 'e2e-agent' : 'x' }, api_key: NEW_KEY })
      }
      if (req.method === 'POST' && req.url === '/v1/agents/recover') {
        if (body.email === 'unknown@example.com') return send(200, { message: 'masked' })
        return send(200, { pending_id: 'pnd_rec', message: 'sent' })
      }
      if (req.method === 'POST' && req.url === '/v1/agents/recover/verify') {
        if (body.code !== '654321') return send(400, { code: 'INVALID_CODE', message: 'bad code' })
        return send(200, { handle: 'lost-agent', api_key: RECOVERED_KEY })
      }
      if (req.method === 'GET' && req.url === '/v1/agents/me') {
        return send(200, { handle: 'e2e-agent', status: 'active' })
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
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-ide2e-'))
  fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-idhome-'))
})

async function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await exec(process.execPath, [BIN, ...args], {
      env: {
        ...process.env,
        AGENTCHAT_HOME: home,
        HOME: fakeHome, // anchors resolve under here on POSIX…
        USERPROFILE: fakeHome, // …and here on Windows — never the real ~
        AGENTCHAT_API_KEY: '',
        AGENTCHAT_API_BASE: '',
        AGENTCHAT_LOG_LEVEL: 'silent',
      },
    })
    return { code: 0, stdout, stderr }
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string }
    return { code: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' }
  }
}

describe('register e2e', () => {
  it('two-invocation flow writes 0600 credentials, anchors existing hosts, hints restart', async () => {
    fs.mkdirSync(path.join(fakeHome, '.claude')) // Claude Code "installed" on this machine
    const first = await run(['register', '--email', 'dev@example.com', '--handle', 'e2e-agent', '--api-base', base])
    expect(first.code).toBe(0)
    expect(first.stdout).toContain('agentchat register --code')
    expect(JSON.parse(fs.readFileSync(path.join(home, 'pending.json'), 'utf-8'))).toMatchObject({
      kind: 'register',
      pending_id: 'pnd_e2e',
    })

    const second = await run(['register', '--code', '123456'])
    expect(second.code).toBe(0)
    expect(second.stdout).toContain('Registered: @e2e-agent')
    expect(second.stdout).toContain('Restart your agent session')
    expect(second.stdout).toContain('anchor claude-code: written')

    const creds = JSON.parse(fs.readFileSync(path.join(home, 'credentials'), 'utf-8'))
    expect(creds).toMatchObject({ api_key: NEW_KEY, handle: 'e2e-agent', api_base: base })
    if (process.platform !== 'win32') {
      // Windows has no POSIX mode bits — stat reports 0o666 regardless of chmod.
      expect(fs.statSync(path.join(home, 'credentials')).mode & 0o777).toBe(0o600)
    }
    expect(fs.existsSync(path.join(home, 'pending.json'))).toBe(false)
    expect(fs.readFileSync(path.join(fakeHome, '.claude', 'CLAUDE.md'), 'utf-8')).toContain('@e2e-agent')
  })

  it('surfaces HANDLE_TAKEN with actionable copy and non-zero exit', async () => {
    const result = await run(['register', '--email', 'dev@example.com', '--handle', 'taken-handle', '--api-base', base])
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('already taken')
  })

  it('rejects flagless invocation without a TTY instead of hanging', async () => {
    const result = await run(['register', '--api-base', base])
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('--email')
  })

  it('refuses to complete a recovery via register --code', async () => {
    await run(['recover', '--email', 'dev@example.com', '--api-base', base])
    const result = await run(['register', '--code', '654321'])
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('agentchat recover --code')
  })
})

describe('recover e2e', () => {
  it('re-keys and stores the server-reported handle', async () => {
    const first = await run(['recover', '--email', 'dev@example.com', '--api-base', base])
    expect(first.code).toBe(0)
    expect(first.stdout).toContain('rotates the API key')

    const second = await run(['recover', '--code', '654321'])
    expect(second.code).toBe(0)
    expect(second.stdout).toContain('Recovered: @lost-agent')
    const creds = JSON.parse(fs.readFileSync(path.join(home, 'credentials'), 'utf-8'))
    expect(creds).toMatchObject({ api_key: RECOVERED_KEY, handle: 'lost-agent' })
  })

  it('handles the existence-masked response without writing pending state', async () => {
    const result = await run(['recover', '--email', 'unknown@example.com', '--api-base', base])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('If an agent is registered')
    expect(fs.existsSync(path.join(home, 'pending.json'))).toBe(false)
  })
})
