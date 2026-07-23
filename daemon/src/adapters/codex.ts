import * as fs from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { log } from '../log.js'
import type { RuntimeAdapter, TurnContext, TurnResult } from './types.js'

// ─── Codex adapter ──────────────────────────────────────────────────────────
//
// Drives `codex exec` on the box, riding the user's ChatGPT subscription. The
// user has already run `agentchat install` for Codex, so CODEX_HOME carries
// the AgentChat MCP server (pointed at this agent's identity), the AGENTS.md
// etiquette, and the codex login. We map each AgentChat conversation to a
// resumable codex thread so turn N remembers turns 1..N-1.
//
// Empirically load-bearing (verified building the plugin): `codex exec` HANGS
// unless stdin is closed → we spawn with stdio.stdin = 'ignore'. And the
// auto-approve for our tools is set in the installed config (approval_mode
// "approve") — we don't pass --yolo (never weaken the user's sandbox).

const TURN_TIMEOUT_MS = 240_000

export class CodexAdapter implements RuntimeAdapter {
  readonly name = 'codex'
  // conversationId → codex thread_id (in-memory; on restart a conversation
  // starts a fresh thread and the agent re-reads history via MCP).
  private readonly threads = new Map<string, string>()

  constructor(
    private readonly codexHome: string,
    private readonly workdir: string,
  ) {}

  async preflight(): Promise<{ ok: boolean; detail?: string }> {
    const which = spawnSync('codex', ['--version'], { encoding: 'utf-8' })
    if (which.error) return { ok: false, detail: 'codex CLI not found on PATH' }
    const status = spawnSync('codex', ['login', 'status'], {
      encoding: 'utf-8',
      env: { ...process.env, CODEX_HOME: this.codexHome },
    })
    if ((status.stdout + status.stderr).toLowerCase().includes('not logged in')) {
      return { ok: false, detail: 'codex is not logged in (run `codex login` on this machine)' }
    }
    fs.mkdirSync(this.workdir, { recursive: true })
    return { ok: true }
  }

  async runTurn(ctx: TurnContext): Promise<TurnResult> {
    const prior = this.threads.get(ctx.conversationId)
    const prompt = buildPrompt(ctx)
    // `codex exec resume` inherits the original session's working directory and
    // REJECTS -C (it is an `exec`-only flag: passing it fails with exit 2,
    // "unexpected argument '-C'"). So the workdir goes on the FRESH turn only;
    // resumes carry just the shared flags.
    const common = ['--json', '--dangerously-bypass-hook-trust', '--skip-git-repo-check']
    const args = prior
      ? ['exec', 'resume', prior, ...common, prompt]
      : ['exec', ...common, '-C', this.workdir, prompt]

    return new Promise<TurnResult>((resolve) => {
      const child = spawn('codex', args, {
        // stdin MUST be closed or codex exec hangs forever waiting on EOF.
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, CODEX_HOME: this.codexHome, AGENTCHAT_LOG_LEVEL: 'silent' },
      })
      let out = ''
      let sawSend = false
      let threadId: string | undefined
      child.stdout.on('data', (d) => {
        out += d
        // Capture the thread id for continuity + note whether a send happened.
        for (const line of String(d).split('\n')) {
          if (!line.trim()) continue
          try {
            const e = JSON.parse(line)
            if (e.type === 'thread.started' && typeof e.thread_id === 'string') threadId = e.thread_id
            if (e.item?.type === 'mcp_tool_call' && e.item.tool === 'agentchat_send_message') sawSend = true
          } catch {
            /* partial line */
          }
        }
      })
      child.stderr.on('data', () => {})

      const killTimer = setTimeout(() => {
        try {
          child.kill('SIGKILL')
        } catch {
          /* ignore */
        }
        resolve({ ok: false, detail: 'turn timed out' })
      }, TURN_TIMEOUT_MS)

      child.on('error', (err) => {
        clearTimeout(killTimer)
        resolve({ ok: false, fatal: true, detail: `codex spawn failed: ${String(err)}` })
      })

      child.on('close', (code) => {
        clearTimeout(killTimer)
        if (threadId && !prior) this.threads.set(ctx.conversationId, threadId)
        // We DISCARD the turn text — the reply (if any) went via the MCP send
        // tool. A clean exit with no send is a deliberate silence, not a
        // failure. Non-zero exit is a real turn failure.
        if (code === 0) {
          log.info(`codex turn done for ${ctx.conversationId} (sent=${sawSend})`)
          resolve({ ok: true, detail: sawSend ? 'replied' : 'silent' })
        } else {
          resolve({ ok: false, detail: `codex exited ${code}` })
        }
      })
    })
  }
}

function buildPrompt(ctx: TurnContext): string {
  return [
    `A new AgentChat message just arrived in conversation ${ctx.conversationId} from @${ctx.sender}:`,
    `"${ctx.text}"`,
    '',
    'Handle it exactly as your AGENTS.md / AgentChat etiquette directs: read the',
    'conversation first with agentchat_get_conversation, then reply via',
    'agentchat_send_message ONLY if a reply is genuinely warranted, or stay',
    'silent (do nothing) if it is not — an FYI, a thanks, or a closed thread',
    'gets silence. Do not narrate; just act. You are running unattended, so do',
    'not ask the human anything — if a reply would commit them to something,',
    'stay silent instead.',
  ].join('\n')
}
