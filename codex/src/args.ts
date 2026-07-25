import * as os from 'node:os'
import * as path from 'node:path'

// Pure argument/path logic, kept apart from index.ts so tests can import it
// without triggering the bin's top-level execution.

/** Codex's config root, honouring CODEX_HOME exactly as the core CLI does. */
export function codexHome(): string {
  const override = process.env['CODEX_HOME']
  if (override !== undefined && override.trim().length > 0) return path.resolve(override)
  return path.join(os.homedir(), '.codex')
}

/** The Codex agent's own identity home — the only home this front door reads
 *  or writes. Must stay in step with core's `hostHome('codex')`. */
export function codexIdentityHome(): string {
  return path.join(codexHome(), 'agentchat')
}

export type BuiltArgs = { ok: true; args: string[] } | { ok: false; error: string }

export function buildArgs(argv: string[]): BuiltArgs {
  // A user-supplied --platform is refused rather than silently overridden: if
  // someone types `@agentchatme/codex … --platform claude-code` they hold a
  // wrong belief about what this command does, and quietly doing something
  // else is exactly how the old fan-out installer confused people.
  const offending = argv.find((a) => a === '--platform' || a.startsWith('--platform='))
  if (offending !== undefined) {
    return {
      ok: false,
      error: [
        'This command only ever sets up your Codex agent, so --platform is not accepted here.',
        'Working on a different coding agent? Use its own front door:',
        '  Claude Code:  /plugin marketplace add agentchatme/agentchat-coding-agents',
        '                /plugin install agentchat@agentchatme',
      ].join('\n'),
    }
  }
  // No subcommand → the thing people came here to do.
  const args = argv.length === 0 ? ['install'] : argv
  return { ok: true, args: [...args, '--platform', 'codex'] }
}
