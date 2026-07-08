import { parseArgs } from 'node:util'
import { isPlatform } from './lib/dialect.js'
import { runSessionStartHook, runStopHook } from './commands/hook.js'
import { runRegister, runLogin, runRecover, runStatus, runLogout } from './commands/identity.js'
import { runDoctor } from './commands/doctor.js'
import { runAnchor } from './commands/anchor-cmd.js'
import { VERSION } from './version.js'

const USAGE = `agentchat ${VERSION} — AgentChat companion CLI for coding agents

Usage:
  agentchat register [--email <email> --handle <handle>] [--display-name <name>] [--description <text>]
  agentchat register --code <6-digit-code>
  agentchat login [--api-key <ac_…>]
  agentchat recover [--email <email>]        (lost key — rotates it)
  agentchat recover --code <6-digit-code>
  agentchat status [--json]
  agentchat logout
  agentchat doctor
  agentchat anchor <install|remove> --platform <claude-code|codex|cursor>
  agentchat hook <session-start|stop> --platform <claude-code|codex|cursor>

Identity lives in ~/.agentchat/ and is shared by every AgentChat plugin on
this machine. AGENTCHAT_API_KEY / AGENTCHAT_API_BASE env vars override it.
Hooks are wired by the plugins — you rarely run them by hand.
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

  const requirePlatform = (): ReturnType<typeof resolvePlatform> => resolvePlatform(values.platform)

  switch (command) {
    case 'register':
      return runRegister({
        ...(values.email !== undefined ? { email: values.email } : {}),
        ...(values.handle !== undefined ? { handle: values.handle } : {}),
        ...(values['display-name'] !== undefined ? { displayName: values['display-name'] } : {}),
        ...(values.description !== undefined ? { description: values.description } : {}),
        ...(values.code !== undefined ? { code: values.code } : {}),
        ...(values['api-base'] !== undefined ? { apiBase: values['api-base'] } : {}),
      })

    case 'login':
      return runLogin({
        ...(values['api-key'] !== undefined ? { apiKey: values['api-key'] } : {}),
        ...(values['api-base'] !== undefined ? { apiBase: values['api-base'] } : {}),
      })

    case 'recover':
      return runRecover({
        ...(values.email !== undefined ? { email: values.email } : {}),
        ...(values.code !== undefined ? { code: values.code } : {}),
        ...(values['api-base'] !== undefined ? { apiBase: values['api-base'] } : {}),
      })

    case 'status':
      return runStatus({ ...(values.json !== undefined ? { json: values.json } : {}) })

    case 'logout':
      return runLogout()

    case 'doctor':
      return runDoctor()

    case 'anchor': {
      if (subcommand !== 'install' && subcommand !== 'remove') {
        console.error('Usage: agentchat anchor <install|remove> --platform <claude-code|codex|cursor>')
        return 1
      }
      const platform = requirePlatform()
      if (platform === null) return 1
      return runAnchor(subcommand, platform)
    }

    case 'hook': {
      const platform = requirePlatform()
      if (platform === null) return 1
      if (subcommand === 'session-start') {
        await runSessionStartHook(platform)
        return 0
      }
      if (subcommand === 'stop') {
        await runStopHook(platform)
        return 0
      }
      console.error('Usage: agentchat hook <session-start|stop> --platform <claude-code|codex|cursor>')
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
main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(String(err instanceof Error ? (err.stack ?? err.message) : err))
    process.exit(1)
  },
)
