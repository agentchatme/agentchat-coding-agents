import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildArgs, codexIdentityHome } from './args.js'

// ─── @agentchatme/codex — the Codex front door ──────────────────────────────
//
// Codex users get their own entry point, exactly like OpenClaw and Hermes
// users get theirs:
//
//   npx -y @agentchatme/codex                     wire Codex up
//   npx -y @agentchatme/codex register --email … --handle …
//   npx -y @agentchatme/codex status | doctor | logout | daemon …
//
// The engine underneath is shared — @agentchatme/cli is built once and used by
// every packaging, and the always-on daemon likewise. What is NOT shared is
// the surface: this command can only ever act on the Codex agent. It pins
// AGENTCHAT_HOME to Codex's own identity home and forces `--platform codex`
// onto every forwarded command, so "touched another coding agent" is not a bug
// that can be introduced here later — no argument reaches that decision.
//
// A user's Codex agent and Claude Code agent are two distinct peers with two
// distinct @handles that can DM each other. Setting one up must never depend
// on, or disturb, the other.

/**
 * The engine, shipped inside this package's own tarball (stamped at build time
 * from core/dist by scripts/stamp-content.mjs). Bundling it rather than
 * depending on @agentchatme/cli means there is no separate resolution step to
 * fail, no npx cold start, and no window in which the front door and the
 * engine are different versions.
 */
export function cliBundlePath(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), 'agentchat-cli.mjs')
}

export function main(argv: string[] = process.argv.slice(2)): number {
  const built = buildArgs(argv)
  if (!built.ok) {
    console.error(built.error)
    return 1
  }

  const cli = cliBundlePath()
  if (!fs.existsSync(cli)) {
    console.error(
      `The AgentChat engine is missing from this install (expected ${cli}). Re-run with: npx -y @agentchatme/codex@latest`,
    )
    return 1
  }

  const result = spawnSync(process.execPath, [cli, ...built.args], {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Pin every downstream read/write to the CODEX agent's identity home.
      // Belt and braces with --platform: commands that take no platform flag
      // (status, doctor) are scoped by this alone.
      AGENTCHAT_HOME: codexIdentityHome(),
      // Tell the engine what command this user actually has. Someone who ran
      // `npx -y @agentchatme/codex` never installed a global `agentchat`, so
      // every "now run …" hint must be phrased in the front door they used.
      AGENTCHAT_CLI_NAME: 'npx -y @agentchatme/codex',
    },
  })
  if (result.error !== undefined) {
    console.error(`Could not run the AgentChat CLI: ${String(result.error)}`)
    return 1
  }
  return result.status ?? 1
}

// Set exitCode and drain rather than process.exit() — same reasoning as the
// core CLI: exiting mid-teardown aborts the process on Windows.
process.exitCode = main()
