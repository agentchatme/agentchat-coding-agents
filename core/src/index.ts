import { parseArgs } from 'node:util'
import { isPlatform, type Platform } from './lib/dialect.js'
import { bindHostHome } from './lib/paths.js'
import { runSessionStartHook, runStopHook, runUserPromptHook } from './commands/hook.js'
import { runRegister, runLogin, runRecover, runStatus, runLogout } from './commands/identity.js'
import { runInstall, resolveHost, ambiguousHostMessage } from './commands/install.js'
import { runDoctor } from './commands/doctor.js'
import { runAnchor } from './commands/anchor-cmd.js'
import { runDaemonCmd } from './commands/daemon.js'
import { VERSION } from './version.js'

const USAGE = `agentchat ${VERSION} — AgentChat companion CLI for coding agents

Usage:
  agentchat install                          (wire up your coding agent)
  agentchat register [--email <email> --handle <handle>]   (get your @handle)
  agentchat register --code <6-digit-code>
  agentchat login [--api-key <ac_…>]         (already have an account)
  agentchat recover [--email <email>]        (lost your key — rotates it)
  agentchat recover --code <6-digit-code>
  agentchat status [--json]
  agentchat logout [--all]
  agentchat daemon <install|enable|disable|status|uninstall>   (always-on presence)
  agentchat doctor [--fix]

Each coding agent on this machine is a SEPARATE AgentChat agent with its own
@handle, and they can DM each other. Every command that changes something acts
on exactly one of them — the installed one, or the one you name with
--platform <claude-code|codex>. Nothing ever touches a second agent behind your
back; "agentchat logout --all" is the one opt-in that spans all of them.

status/doctor are read-only and report every agent. AGENTCHAT_API_KEY /
AGENTCHAT_API_BASE override the stored identity. (anchor/hook are wired by the
plugin — you don't run them.)
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
        all: { type: 'boolean' },
        fix: { type: 'boolean' },
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

  // Single-host commands resolve exactly one platform (explicit --platform
  // wins, else the installed agent is auto-detected) and bind its identity
  // home — so users never need to type --platform on a one-agent machine.
  //
  // EVERY mutating command is single-host, `logout` included: each host is a
  // separate agent with its own account, so a command that touched more than
  // one would be mutating an account the user never named. `logout --all` is
  // the explicit opt-out. status/doctor are read-only and report every host.
  // Hooks always get an explicit --platform from the plugin wiring. An
  // explicit AGENTCHAT_HOME still wins inside bindHostHome.
  const scoped =
    command === 'register' ||
    command === 'login' ||
    command === 'recover' ||
    command === 'daemon' ||
    command === 'anchor' ||
    (command === 'logout' && values.all !== true)
  let active: Platform | undefined
  if (scoped) {
    const choice = resolveHost(values.platform)
    if (!choice.ok) {
      // Several agents installed and none named — refuse rather than guess
      // which account to touch. Nothing has been mutated at this point.
      console.error(ambiguousHostMessage(command, choice.candidates))
      return 1
    }
    active = choice.platform
    bindHostHome(active)
  }

  switch (command) {
    case 'install':
      return runInstall({
        ...(values.platform !== undefined ? { platform: values.platform } : {}),
      })

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
      return runLogout({
        ...(active !== undefined ? { platform: active } : {}),
        ...(values.all === true ? { all: true } : {}),
      })

    case 'doctor':
      return runDoctor({ ...(values.fix === true ? { fix: true } : {}) })

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
