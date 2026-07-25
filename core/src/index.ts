import { parseArgs } from 'node:util'
import { isPlatform, type Platform } from './lib/dialect.js'
import { bindHostHome } from './lib/paths.js'
import { runSessionStartHook, runStopHook, runUserPromptHook } from './commands/hook.js'
import { runRegister, runLogin, runRecover, runStatus, runLogout } from './commands/identity.js'
import { runInstall, autoPlatform } from './commands/install.js'
import { runDoctor } from './commands/doctor.js'
import { runAnchor } from './commands/anchor-cmd.js'
import { runDaemonCmd } from './commands/daemon.js'
import { VERSION } from './version.js'

const USAGE = `agentchat ${VERSION} — AgentChat companion CLI for coding agents

Usage:
  agentchat install                          (detect your coding agent + wire it up)
  agentchat register [--email <email> --handle <handle>]   (get your @handle)
  agentchat register --code <6-digit-code>
  agentchat login [--api-key <ac_…>]         (already have an account)
  agentchat recover [--email <email>]        (lost your key — rotates it)
  agentchat recover --code <6-digit-code>
  agentchat status [--json]
  agentchat logout
  agentchat daemon <install|enable|disable|status|uninstall>   (always-on presence)
  agentchat doctor

The command detects which coding agent you're on automatically. Only on a
machine with more than one do you need --platform <claude-code|codex> to point
at a specific one. Identity is per-agent; AGENTCHAT_API_KEY / AGENTCHAT_API_BASE
env vars override it. (anchor/hook are wired by the plugin — you don't run them.)
`

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  let parsed
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        email: { type: 'string' },
        handle: { type: 'string' },
        'display-name': { type: 'string' },
        description: { type: 'string' },
        code: { type: 'string' },
        'api-key': { type: 'string' },
        'api-base': { type: 'string' },
        platform: { type: 'string' },
        json: { type: 'boolean' },
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
  const [command, subcommand] = positionals

  if (values.version) {
    console.log(VERSION)
    return 0
  }
  if (values.help || command === undefined || command === 'help') {
    console.log(USAGE)
    return 0
  }

  // Single-host commands resolve a platform (explicit --platform wins, else the
  // installed agent is auto-detected) and bind its identity home — so users
  // never need to type --platform. status/logout deliberately span every host;
  // hooks are always invoked with an explicit --platform by the plugin wiring.
  // An explicit AGENTCHAT_HOME still wins inside bindHostHome.
  const scoped =
    command === 'register' ||
    command === 'login' ||
    command === 'recover' ||
    command === 'daemon' ||
    command === 'anchor'
  const active: Platform | undefined = scoped ? autoPlatform(values.platform) : undefined
  if (active !== undefined) bindHostHome(active)

  switch (command) {
    case 'install':
      return runInstall()

    case 'register':
      return runRegister({
        ...(values.email !== undefined ? { email: values.email } : {}),
        ...(values.handle !== undefined ? { handle: values.handle } : {}),
        ...(values['display-name'] !== undefined ? { displayName: values['display-name'] } : {}),
        ...(values.description !== undefined ? { description: values.description } : {}),
        ...(values.code !== undefined ? { code: values.code } : {}),
        ...(values['api-base'] !== undefined ? { apiBase: values['api-base'] } : {}),
        ...(active !== undefined ? { platform: active } : {}),
      })

    case 'login':
      return runLogin({
        ...(values['api-key'] !== undefined ? { apiKey: values['api-key'] } : {}),
        ...(values['api-base'] !== undefined ? { apiBase: values['api-base'] } : {}),
        ...(active !== undefined ? { platform: active } : {}),
      })

    case 'recover':
      return runRecover({
        ...(values.email !== undefined ? { email: values.email } : {}),
        ...(values.code !== undefined ? { code: values.code } : {}),
        ...(values['api-base'] !== undefined ? { apiBase: values['api-base'] } : {}),
        ...(active !== undefined ? { platform: active } : {}),
      })

    case 'status':
      return runStatus({ ...(values.json !== undefined ? { json: values.json } : {}) })

    case 'logout':
      return runLogout()

    case 'doctor':
      return runDoctor()

    case 'daemon': {
      if (active === undefined) return 1 // unreachable: daemon is a scoped command
      return runDaemonCmd(subcommand, active)
    }

    case 'anchor': {
      if (subcommand !== 'install' && subcommand !== 'remove') {
        console.error('Usage: agentchat anchor <install|remove>')
        return 1
      }
      if (active === undefined) return 1 // unreachable: anchor is a scoped command
      return runAnchor(subcommand, active)
    }

    case 'hook': {
      // Hooks are always invoked with an explicit --platform by the wiring.
      const platform = resolvePlatform(values.platform)
      if (platform === null) return 1
      if (subcommand === 'session-start') {
        await runSessionStartHook(platform)
        return 0
      }
      if (subcommand === 'stop') {
        await runStopHook(platform)
        return 0
      }
      if (subcommand === 'user-prompt') {
        await runUserPromptHook(platform)
        return 0
      }
      console.error('Usage: agentchat hook <session-start|stop|user-prompt> --platform <claude-code|codex|cursor>')
      return 1
    }

    default:
      console.error(`Unknown command: ${command}`)
      console.error(USAGE)
      return 1
  }
}

function resolvePlatform(value: string | undefined) {
  if (value === undefined || !isPlatform(value)) {
    console.error('Missing or invalid --platform (expected claude-code, codex, or cursor).')
    return null
  }
  return value
}

// Invoked as a bin: run and translate the exit code. The hook commands
// swallow their own errors (exit 0 always); everything else may return 1.
// Set exitCode and drain naturally — NEVER process.exit(): exiting while
// undici tears down its keep-alive socket (any command that spoke HTTP)
// aborts the whole process on Windows with a libuv assertion, which a host
// platform reads as a crashed hook. Nothing here holds the loop open, so
// draining is immediate.
main().then(
  (code) => {
    process.exitCode = code
  },
  (err) => {
    console.error(String(err instanceof Error ? (err.stack ?? err.message) : err))
    process.exitCode = 1
  },
)
