import * as fs from 'node:fs'
import * as path from 'node:path'
import { AgentChatClient } from 'agentchatme'
import { resolveIdentity, readPending, readCredentialsFileAt } from '../lib/credentials.js'
import { agentchatHome, credentialsPath, hostHome, statePath } from '../lib/paths.js'
import { hasAnchor, anchorFilePath, readAnchorHandle } from '../lib/anchor.js'
import { anchorFor } from './identity.js'
import { syncPeek } from '../lib/wire.js'
import { VERSION } from '../version.js'
import type { Platform } from '../lib/dialect.js'
import { hint } from '../lib/branding.js'

// ─── doctor ─────────────────────────────────────────────────────────────────
//
// Same support philosophy as `hermes agentchat doctor`: one command that
// tells a confused user (or the agent debugging on their behalf) exactly
// which layer is broken — credentials, network, account state, anchors,
// or local state files.
//
// Reports PER HOST, because each coding agent on the machine is a separate
// AgentChat agent with its own credential, anchor and account. A single
// machine-wide verdict would have to pick one of them to be "the" identity,
// which is the exact confusion this command exists to clear up.

type Verdict = 'PASS' | 'WARN' | 'FAIL'

interface Check {
  name: string
  verdict: Verdict
  detail: string
}

function fmt(check: Check): string {
  return `${check.verdict.padEnd(4)} ${check.name}: ${check.detail}`
}

const HOSTS: Array<[Platform, string]> = [
  ['claude-code', 'Claude Code'],
  ['codex', 'Codex'],
]

export interface DoctorOpts {
  /** Rewrite anchors that disagree with (or are missing for) a host's own
   *  credentials. Off by default — doctor diagnoses before it touches. */
  fix?: boolean
}

// Run `fn` with AGENTCHAT_HOME pointed at `home`, then restore. Sequential
// use only (the env is global) — hosts are checked one at a time.
async function withHome<T>(home: string, fn: () => Promise<T>): Promise<T> {
  const prev = process.env['AGENTCHAT_HOME']
  process.env['AGENTCHAT_HOME'] = home
  try {
    return await fn()
  } finally {
    if (prev === undefined) delete process.env['AGENTCHAT_HOME']
    else process.env['AGENTCHAT_HOME'] = prev
  }
}

/** Everything that is true of one host: its credential, its account, its
 *  anchor — and whether those three agree with each other. */
async function checkHost(platform: Platform, label: string, opts: DoctorOpts): Promise<Check[]> {
  const checks: Check[] = []
  const anchorFile = anchorFilePath(platform)
  const hostDir = anchorFile === null ? null : path.dirname(anchorFile)
  const home = hostHome(platform)

  const installed = hostDir !== null && fs.existsSync(hostDir)
  const creds = readCredentialsFileAt(home)
  if (!installed && creds === null) return [] // host absent entirely — say nothing

  const p = (name: string): string => `${label}/${name}`

  if (creds === null) {
    checks.push({
      name: p('credentials'),
      verdict: 'FAIL',
      detail: `no identity at ${path.join(home, 'credentials')} — run \`${hint('register', platform)}\``,
    })
    return checks
  }

  checks.push({ name: p('credentials'), verdict: 'PASS', detail: `@${creds.handle} (${home})` })

  await withHome(home, async () => {
    const identity = resolveIdentity()
    if (identity === null) return
    try {
      const client = new AgentChatClient({ apiKey: identity.apiKey, baseUrl: identity.apiBase })
      const started = Date.now()
      const me = await client.getMe()
      const status = me.status ?? 'active'
      checks.push({
        name: p('api-auth'),
        verdict: status === 'active' ? 'PASS' : 'WARN',
        detail: `@${me.handle} status=${status} (${Date.now() - started}ms, ${identity.apiBase})`,
      })
      // The credential file and the account it actually authenticates as must
      // agree; a stale handle here means every "DM me at @x" the agent says is
      // wrong even though auth succeeds.
      if (me.handle !== creds.handle) {
        checks.push({
          name: p('handle-drift'),
          verdict: 'WARN',
          detail: `credentials say @${creds.handle} but the key authenticates as @${me.handle} — re-run \`agentchat login --platform ${platform}\``,
        })
      }
    } catch (err) {
      checks.push({ name: p('api-auth'), verdict: 'FAIL', detail: `getMe failed: ${String(err)}` })
    }

    try {
      const rows = await syncPeek({ apiKey: identity.apiKey, apiBase: identity.apiBase }, { limit: 5 })
      checks.push({
        name: p('sync-wire'),
        verdict: 'PASS',
        detail: `peek ok, ${rows.length}${rows.length === 5 ? '+' : ''} undelivered queued`,
      })
    } catch (err) {
      checks.push({ name: p('sync-wire'), verdict: 'FAIL', detail: `sync peek failed: ${String(err)}` })
    }
  })

  // ─── The anchor must name THIS host's handle ─────────────────────────────
  //
  // Releases up to 0.0.139 wrote the identity anchor for every host on the
  // machine whenever any one of them registered, so a two-agent box could end
  // up with Codex's AGENTS.md announcing the Claude agent's handle. Such an
  // agent tells peers to DM an address that reaches someone else while its own
  // inbox sits at a handle it no longer knows about. Detect it, and with
  // --fix rewrite the anchor from the host's own credentials.
  if (anchorFile === null) {
    checks.push({ name: p('anchor'), verdict: 'PASS', detail: 'no always-loaded instruction file — n/a' })
    return checks
  }

  const claimed = readAnchorHandle(platform)
  const repair = (why: string): void => {
    if (opts.fix !== true) {
      checks.push({
        name: p('anchor'),
        verdict: 'WARN',
        detail: `${why} — repair with \`${hint('doctor --fix')}\``,
      })
      return
    }
    const report = anchorFor(platform, creds.handle)
    const failed = report.some((line) => line.includes('FAILED'))
    checks.push({
      name: p('anchor'),
      verdict: failed ? 'FAIL' : 'PASS',
      detail: failed ? `could not repair ${anchorFile}: ${report.join('; ')}` : `repaired → @${creds.handle} in ${anchorFile}`,
    })
  }

  if (claimed === null) {
    if (!hasAnchor(platform)) {
      repair(`no identity block in ${anchorFile}`)
    } else {
      // Block present but no handle in it — malformed, same repair path.
      repair(`identity block in ${anchorFile} names no handle`)
    }
  } else if (claimed !== creds.handle) {
    repair(`${anchorFile} says @${claimed} but this agent is @${creds.handle}`)
  } else {
    checks.push({ name: p('anchor'), verdict: 'PASS', detail: `@${claimed} in ${anchorFile}` })
  }

  return checks
}

export async function runDoctor(opts: DoctorOpts = {}): Promise<number> {
  const checks: Check[] = []

  checks.push({
    name: 'cli',
    verdict: 'PASS',
    detail: `@agentchatme/cli ${VERSION}, node ${process.version}`,
  })

  const major = Number.parseInt(process.version.replace(/^v/, '').split('.')[0] ?? '0', 10)
  if (major < 20) {
    checks.push({ name: 'node', verdict: 'FAIL', detail: `node >=20 required, found ${process.version}` })
  }

  // An explicit AGENTCHAT_HOME (or --platform) means "this one identity" —
  // honour it instead of scanning, so CI and power users get a scoped answer.
  const bound = (process.env['AGENTCHAT_HOME'] ?? '').trim()
  if (bound.length > 0) {
    const identity = resolveIdentity()
    const pending = readPending()
    if (identity === null) {
      checks.push({
        name: 'credentials',
        verdict: 'FAIL',
        detail:
          pending?.kind === 'recover'
            ? 'account recovery awaiting its emailed code — finish with `agentchat recover --code <code>`'
            : pending !== null
              ? `registration for @${pending.handle ?? '?'} awaiting its emailed code — finish with \`agentchat register --code <code>\``
              : `none found (no AGENTCHAT_API_KEY env, no ${credentialsPath()}) — run \`agentchat register\` or \`agentchat login\``,
      })
    } else {
      checks.push({
        name: 'credentials',
        verdict: 'PASS',
        detail: `source=${identity.source}${identity.handle ? `, handle=@${identity.handle}` : ''} (${agentchatHome()})`,
      })
      try {
        const client = new AgentChatClient({ apiKey: identity.apiKey, baseUrl: identity.apiBase })
        const started = Date.now()
        const me = await client.getMe()
        checks.push({
          name: 'api-auth',
          verdict: (me.status ?? 'active') === 'active' ? 'PASS' : 'WARN',
          detail: `@${me.handle} status=${me.status ?? 'active'} (${Date.now() - started}ms, ${identity.apiBase})`,
        })
      } catch (err) {
        checks.push({ name: 'api-auth', verdict: 'FAIL', detail: `getMe failed: ${String(err)}` })
      }
    }
  } else {
    let anyHost = false
    for (const [platform, label] of HOSTS) {
      const hostChecks = await checkHost(platform, label, opts)
      if (hostChecks.length > 0) anyHost = true
      checks.push(...hostChecks)
    }
    if (!anyHost) {
      const pending = readPending()
      checks.push({
        name: 'credentials',
        verdict: 'FAIL',
        detail:
          pending !== null
            ? `a registration for @${pending.handle ?? '?'} is awaiting its emailed code — finish with \`agentchat register --code <code>\``
            : 'no coding agent set up yet on this machine — run `agentchat install`',
      })
    }
  }

  try {
    fs.mkdirSync(agentchatHome(), { recursive: true })
    fs.accessSync(agentchatHome(), fs.constants.W_OK)
    checks.push({ name: 'state', verdict: 'PASS', detail: `${statePath()} writable` })
  } catch {
    checks.push({ name: 'state', verdict: 'FAIL', detail: `${agentchatHome()} is not writable` })
  }

  if (process.env['AGENTCHAT_HOOKS_ENABLED'] === '0') {
    checks.push({ name: 'hooks', verdict: 'WARN', detail: 'AGENTCHAT_HOOKS_ENABLED=0 — inbox hooks are disabled' })
  }

  console.log(checks.map(fmt).join('\n'))
  return checks.some((c) => c.verdict === 'FAIL') ? 1 : 0
}
