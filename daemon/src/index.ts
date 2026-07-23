import { parseArgs } from 'node:util'
import { resolveConfig, type Runtime } from './config.js'
import { acquireLeaderLock } from './leader-lock.js'
import { Daemon } from './daemon.js'
import { CodexAdapter } from './adapters/codex.js'
import { ClaudeAdapter } from './adapters/claude.js'
import type { RuntimeAdapter } from './adapters/types.js'
import { log } from './log.js'

const VERSION = '0.0.1'

const USAGE = `agentchatd ${VERSION} — always-on presence for an AgentChat coding agent

Usage:
  agentchatd start [--runtime codex|claude-code] [--home <dir>] [--workdir <dir>]
  agentchatd doctor [--runtime codex] [--home <dir>]

Runs AS one host agent (the same identity your in-session plugin uses — never a
separate account), holds the WebSocket, and answers messages while that agent's
coding session is offline by spawning a headless turn of your runtime.

Keep it on a machine that stays up (a small VPS) for true 24/7 presence; on your
laptop it only runs while the laptop is awake.
`

async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  let parsed
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        runtime: { type: 'string' },
        home: { type: 'string' },
        workdir: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    })
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err))
    console.error(USAGE)
    return 1
  }
  const { values, positionals } = parsed
  const command = positionals[0]

  if (values.version) {
    console.log(VERSION)
    return 0
  }
  if (values.help || command === undefined || command === 'help') {
    console.log(USAGE)
    return 0
  }

  const runtime = (values.runtime ?? 'codex') as Runtime
  if (runtime !== 'codex' && runtime !== 'claude-code') {
    console.error(`Unknown --runtime "${runtime}" (expected codex or claude-code).`)
    return 1
  }

  let cfg
  try {
    cfg = resolveConfig({
      ...(values.home !== undefined ? { home: values.home } : {}),
      runtime,
      ...(values.workdir !== undefined ? { workdir: values.workdir } : {}),
    })
  } catch (err) {
    console.error(`Could not load the agent identity: ${String(err)}`)
    console.error('Run `agentchat register --platform ' + runtime + '` first, or pass --home.')
    return 1
  }

  const adapter: RuntimeAdapter =
    runtime === 'codex'
      ? new CodexAdapter(cfg.runtimeHome, cfg.workdir)
      : new ClaudeAdapter(cfg.runtimeHome, cfg.home, cfg.workdir)

  if (command === 'doctor') {
    const pre = await adapter.preflight()
    console.log(`identity: @${cfg.handle}  (home ${cfg.home})`)
    console.log(`api: ${cfg.apiBase}  ws: ${cfg.wsUrl}`)
    console.log(`runtime: ${runtime} — ${pre.ok ? 'ready ✓' : 'NOT READY: ' + pre.detail}`)
    return pre.ok ? 0 : 1
  }

  if (command !== 'start') {
    console.error(`Unknown command: ${command}`)
    console.error(USAGE)
    return 1
  }

  // One daemon per identity.
  const lock = acquireLeaderLock(cfg.home)
  if (lock === null) return 1

  const daemon = new Daemon(cfg, adapter)
  const shutdown = (sig: string): void => {
    log.info(`${sig} — shutting down`)
    daemon.stop()
    lock.release()
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  try {
    await daemon.start()
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err))
    lock.release()
    return 1
  }
  // Hold the process open; the WS client keeps event-loop work alive.
  return await new Promise<number>(() => {})
}

main().then(
  (code) => {
    if (code !== undefined) process.exitCode = code
  },
  (err) => {
    console.error(String(err instanceof Error ? (err.stack ?? err.message) : err))
    process.exitCode = 1
  },
)
