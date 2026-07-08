import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as fs from 'node:fs'
import * as http from 'node:http'
import * as os from 'node:os'
import * as path from 'node:path'

const exec = promisify(execFile)

// ─── End-to-end: the built binary against a fake AgentChat API ─────────────
//
// Exercises the real bin (dist/index.js — run `pnpm build` first) exactly
// the way a host platform does: JSON on stdin, JSON on stdout, exit 0 no
// matter what. The fake server speaks the PRODUCTION wire shape (bare
// array, string delivery cursors) and records acks so ack-on-injection is
// asserted, not assumed.

const BIN = path.join(__dirname, '..', 'dist', 'index.js')
const KEY = 'ac_test_0123456789abcdef0123456789abcdef'

interface FakeApi {
  server: http.Server
  base: string
  queue: Array<Record<string, unknown>>
  acks: string[]
  syncCalls: number
  failAck: boolean
}

function makeRow(n: number, conversation = 'conv_e2e'): Record<string, unknown> {
  return {
    id: `msg_${n}`,
    conversation_id: conversation,
    delivery_id: `del_${String(n).padStart(32, '0')}`,
    sender_handle: 'san-asst',
    type: 'text',
    content: { text: `ping ${n}` },
    created_at: new Date(1751900000000 + n * 1000).toISOString(),
  }
}

async function startFakeApi(): Promise<FakeApi> {
  const api: Partial<FakeApi> & { queue: Array<Record<string, unknown>>; acks: string[] } = {
    queue: [],
    acks: [],
    syncCalls: 0,
    failAck: false,
  }
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (req.headers.authorization !== `Bearer ${KEY}`) return send(401, { code: 'UNAUTHORIZED' })

    if (req.method === 'GET' && url.pathname === '/v1/messages/sync') {
      api.syncCalls = (api.syncCalls ?? 0) + 1
      return send(200, api.queue) // bare array — production shape
    }
    if (req.method === 'POST' && url.pathname === '/v1/messages/sync/ack') {
      if (api.failAck) return send(500, { code: 'INTERNAL' })
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const cursor = JSON.parse(body).last_delivery_id as string
        api.acks.push(cursor)
        const before = api.queue.length
        api.queue = api.queue.filter(
          (r) => typeof r['delivery_id'] !== 'string' || String(r['delivery_id']) > cursor,
        )
        send(200, { acked: before - api.queue.length })
      })
      return
    }
    if (req.method === 'GET' && url.pathname === '/v1/agents/me') {
      return send(200, { handle: 'demo-agent', status: 'active' })
    }
    return send(404, { code: 'NOT_FOUND' })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('no port')
  api.server = server
  api.base = `http://127.0.0.1:${address.port}`
  return api as FakeApi
}

let api: FakeApi
let home: string

async function runHook(
  kind: 'session-start' | 'stop',
  platform: string,
  stdin: Record<string, unknown>,
): Promise<{ stdout: string; stderr: string }> {
  const child = exec(
    process.execPath,
    [BIN, 'hook', kind, `--platform`, platform],
    {
      env: {
        ...process.env,
        AGENTCHAT_HOME: home,
        AGENTCHAT_API_KEY: '',
        AGENTCHAT_API_BASE: '',
        AGENTCHAT_LOG_LEVEL: 'silent',
      },
    },
  )
  child.child.stdin?.end(JSON.stringify(stdin))
  const { stdout, stderr } = await child
  return { stdout, stderr }
}

beforeAll(async () => {
  if (!fs.existsSync(BIN)) throw new Error('dist/index.js missing — run `pnpm build` before tests')
  api = await startFakeApi()
})

afterAll(() => {
  api.server.close()
})

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-e2e-'))
  fs.writeFileSync(
    path.join(home, 'credentials'),
    JSON.stringify({ api_key: KEY, handle: 'demo-agent', api_base: api.base }),
    { mode: 0o600 },
  )
  api.queue = []
  api.acks = []
  api.syncCalls = 0
  api.failAck = false
})

describe('session-start hook e2e', () => {
  it('injects a digest and acks exactly the injected batch', async () => {
    api.queue = [makeRow(1), makeRow(2), makeRow(3, 'grp_team')]
    const { stdout } = await runHook('session-start', 'claude-code', { session_id: 's1' })
    const payload = JSON.parse(stdout)
    const context = payload.hookSpecificOutput.additionalContext as string
    expect(payload.hookSpecificOutput.hookEventName).toBe('SessionStart')
    expect(context).toContain('You are @demo-agent on AgentChat.')
    expect(context).toContain('3 unread messages in 2 conversations:')
    expect(context).toContain('"ping 2"')
    expect(api.acks).toEqual([`del_${String(3).padStart(32, '0')}`])
    expect(api.queue).toHaveLength(0)
  })

  it('is silent when the inbox is empty', async () => {
    const { stdout } = await runHook('session-start', 'claude-code', { session_id: 's1' })
    expect(stdout).toBe('')
    expect(api.acks).toHaveLength(0)
  })

  it('degrades to silence when the API is unreachable', async () => {
    fs.writeFileSync(
      path.join(home, 'credentials'),
      JSON.stringify({ api_key: KEY, handle: 'demo-agent', api_base: 'http://127.0.0.1:1' }),
    )
    const { stdout } = await runHook('session-start', 'claude-code', { session_id: 's1' })
    expect(stdout).toBe('')
  })

  it('emits the cursor dialect for cursor', async () => {
    api.queue = [makeRow(1)]
    const { stdout } = await runHook('session-start', 'cursor', { conversation_id: 'c9' })
    const payload = JSON.parse(stdout)
    expect(Object.keys(payload)).toStrictEqual(['additional_context'])
  })

  it('offers registration when unconfigured — but at most once per day', async () => {
    fs.rmSync(path.join(home, 'credentials'))
    const first = await runHook('session-start', 'claude-code', { session_id: 'fresh-1' })
    expect(first.stdout).toContain('no AgentChat identity yet')
    // The instructed command must exist on a FRESH machine: absolute path
    // to the running bundle, not a bare binary name that may not be on PATH.
    expect(first.stdout).toContain(BIN)
    const second = await runHook('session-start', 'claude-code', { session_id: 'fresh-2' })
    expect(second.stdout).toBe('')
  })

  it('prints the digest even when the ack call fails (at-least-once, never at-most-once)', async () => {
    api.queue = [makeRow(1)]
    api.failAck = true
    const { stdout } = await runHook('session-start', 'claude-code', { session_id: 's-ackfail' })
    expect(JSON.parse(stdout).hookSpecificOutput.additionalContext).toContain('"ping 1"')
    expect(api.queue).toHaveLength(1) // still queued — will re-surface (duplicate beats loss)
  })

  it('stops at the first malformed sync row and never acks past it', async () => {
    api.queue = [
      makeRow(1),
      { ...makeRow(2), id: 12345 }, // numeric id fails the schema
      makeRow(3),
    ]
    const { stdout } = await runHook('session-start', 'claude-code', { session_id: 's-prefix' })
    const context = JSON.parse(stdout).hookSpecificOutput.additionalContext as string
    expect(context).toContain('"ping 1"')
    expect(context).not.toContain('ping 3')
    expect(api.acks).toEqual([`del_${String(1).padStart(32, '0')}`])
    expect(api.queue).toHaveLength(2) // malformed row + everything after it stay queued
  })

  it('excludes rows without a delivery cursor instead of re-injecting them forever', async () => {
    api.queue = [{ ...makeRow(1), delivery_id: null }]
    const first = await runHook('session-start', 'claude-code', { session_id: 's-null' })
    expect(first.stdout).toBe('')
    expect(api.acks).toHaveLength(0)
  })

  it('treats compaction as no event: no digest, no ack, no budget reset', async () => {
    api.queue = [makeRow(1)]
    const { stdout } = await runHook('session-start', 'claude-code', {
      session_id: 's-compact',
      source: 'compact',
    })
    expect(stdout).toBe('')
    expect(api.acks).toHaveLength(0)
    expect(api.queue).toHaveLength(1)
  })
})

describe('stop hook e2e', () => {
  it('blocks with a followup and consumes the queue', async () => {
    api.queue = [makeRow(7)]
    const { stdout } = await runHook('stop', 'claude-code', { session_id: 's2' })
    const payload = JSON.parse(stdout)
    expect(payload.decision).toBe('block')
    expect(payload.reason).toContain('While you were working, 1 AgentChat message arrived')
    expect(api.queue).toHaveLength(0)
  })

  it('no-ops on an empty inbox without burning a continuation', async () => {
    const first = await runHook('stop', 'claude-code', { session_id: 's3' })
    expect(first.stdout).toBe('')
    api.queue = [makeRow(1)]
    const second = await runHook('stop', 'claude-code', { session_id: 's3' })
    expect(JSON.parse(second.stdout).decision).toBe('block')
  })

  it('stops continuing after the cap and leaves messages queued', async () => {
    for (let i = 1; i <= 5; i++) {
      api.queue = [makeRow(i)]
      const { stdout } = await runHook('stop', 'codex', { session_id: 'cap-test' })
      expect(JSON.parse(stdout).decision).toBe('block')
    }
    api.queue = [makeRow(99)]
    const capped = await runHook('stop', 'codex', { session_id: 'cap-test' })
    expect(capped.stdout).toBe('')
    expect(api.queue).toHaveLength(1) // NOT acked — surfaces at next session start
    const other = await runHook('stop', 'codex', { session_id: 'different-session' })
    expect(JSON.parse(other.stdout).decision).toBe('block')
  })

  it('session-start resets a capped session — resuming is a new sitting', async () => {
    for (let i = 1; i <= 5; i++) {
      api.queue = [makeRow(i)]
      await runHook('stop', 'codex', { session_id: 'resume-test' })
    }
    api.queue = [makeRow(50)]
    const capped = await runHook('stop', 'codex', { session_id: 'resume-test' })
    expect(capped.stdout).toBe('')

    await runHook('session-start', 'codex', { session_id: 'resume-test' }) // drains row 50, resets budget
    api.queue = [makeRow(51)]
    const revived = await runHook('stop', 'codex', { session_id: 'resume-test' })
    expect(JSON.parse(revived.stdout).decision).toBe('block')
  })

  it('honors the kill switch', async () => {
    api.queue = [makeRow(1)]
    const child = exec(process.execPath, [BIN, 'hook', 'stop', '--platform', 'claude-code'], {
      env: {
        ...process.env,
        AGENTCHAT_HOME: home,
        AGENTCHAT_HOOKS_ENABLED: '0',
        AGENTCHAT_LOG_LEVEL: 'silent',
      },
    })
    child.child.stdin?.end('{}')
    const { stdout } = await child
    expect(stdout).toBe('')
    expect(api.syncCalls).toBe(0)
  })
})
