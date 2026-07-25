import type { Platform } from './dialect.js'

// ─── How to tell a user to run the next command ─────────────────────────────
//
// Each coding agent has its OWN front door, and a user who arrived through one
// of them may not have the `agentchat` binary on their PATH at all — someone
// who ran `npx -y @agentchatme/codex` installed nothing globally. Printing
// "now run `agentchat register`" at that person is a dead end.
//
// So a front door announces itself via AGENTCHAT_CLI_NAME, and every hint we
// print is phrased in the command the user actually has. A front door also
// implies its platform, so hints drop the `--platform` flag that would be
// noise (and is rejected outright by the Codex front door).

/** The command name to put in front of a subcommand in user-facing copy. */
export function cliName(): string {
  const override = process.env['AGENTCHAT_CLI_NAME']?.trim()
  return override !== undefined && override.length > 0 ? override : 'agentchat'
}

/** True when we were invoked through a platform-specific front door, so the
 *  platform is already implied and must not be repeated in hints. */
export function viaFrontDoor(): boolean {
  const override = process.env['AGENTCHAT_CLI_NAME']?.trim()
  return override !== undefined && override.length > 0
}

/**
 * A copy-pasteable command hint. `platform` is appended only when it is both
 * meaningful (the machine has more than one agent, so the caller passes it)
 * and not already implied by the front door the user came through.
 */
export function hint(subcommand: string, platform?: Platform): string {
  const base = `${cliName()} ${subcommand}`
  if (platform === undefined || viaFrontDoor()) return base
  return `${base} --platform ${platform}`
}

/** The canonical way to set up each coding agent — what we point at when
 *  telling a user about an agent they have NOT set up yet. Each is a separate,
 *  self-contained flow; neither touches the other. */
export function frontDoorFor(platform: Platform): string[] {
  switch (platform) {
    case 'claude-code':
      return [
        '/plugin marketplace add agentchatme/agentchat-coding-agents',
        '/plugin install agentchat@agentchatme',
      ]
    case 'codex':
      return ['npx -y @agentchatme/codex']
    case 'cursor':
      return []
  }
}
