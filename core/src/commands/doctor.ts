import * as fs from 'node:fs'
import * as path from 'node:path'
import { AgentChatClient } from 'agentchatme'
import { resolveIdentity, readPending } from '../lib/credentials.js'
import { agentchatHome, credentialsPath, statePath } from '../lib/paths.js'
import { hasAnchor, anchorFilePath } from '../lib/anchor.js'
import { syncPeek } from '../lib/wire.js'
import { VERSION } from '../version.js'

// ─── doctor ─────────────────────────────────────────────────────────────────
//
// Same support philosophy as `hermes agentchat doctor`: one command that
// tells a confused user (or the agent debugging on their behalf) exactly
// which layer is broken — credentials, network, account state, anchors,
// or local state files.

type Verdict = 'PASS' | 'WARN' | 'FAIL'

interface Check {
  name: string
  verdict: Verdict
  detail: string
}

function fmt(check: Check): string {
  return `${check.verdict.padEnd(4)} ${check.name}: ${check.detail}`
}

export async function runDoctor(): Promise<number> {
  const checks: Check[] = []

  checks.push({
    name: 'cli',
    verdict: 'PASS',
    detail: `@agentchatme/cli ${VERSION}, node ${process.version}, home ${agentchatHome()}`,
  })

  const major = Number.parseInt(process.version.replace(/^v/, '').split('.')[0] ?? '0', 10)
  if (major < 20) {
    checks.push({ name: 'node', verdict: 'FAIL', detail: `node >=20 required, found ${process.version}` })
  }

  const envKey = process.env['AGENTCHAT_API_KEY']
  const identity = resolveIdentity()
  const pending = readPending()

  if (identity === null) {
    checks.push({
      name: 'credentials',
      verdict: 'FAIL',
      detail:
        pending?.kind === 'recover'
          ? `account recovery awaiting its emailed code — finish with \`agentchat recover --code <code>\``
          : pending !== null
            ? `registration for @${pending.handle ?? '?'} awaiting its emailed code — finish with \`agentchat register --code <code>\``
            : `none found (no AGENTCHAT_API_KEY env, no ${credentialsPath()}) — run \`agentchat register\` or \`agentchat login\``,
    })
  } else {
    checks.push({
      name: 'credentials',
      verdict: 'PASS',
      detail: `source=${identity.source}${identity.handle ? `, handle=@${identity.handle}` : ''}`,
    })
    if (envKey && envKey.trim().length > 0 && identity.source === 'file') {
      checks.push({
        name: 'env-key',
        verdict: 'WARN',
        detail:
          'AGENTCHAT_API_KEY is set but malformed (under 20 chars) — the credentials-file identity is being used instead. Unset it or fix it.',
      })
    }

    try {
      const client = new AgentChatClient({ apiKey: identity.apiKey, baseUrl: identity.apiBase })
      const started = Date.now()
      const me = await client.getMe()
      const status = me.status ?? 'active'
      checks.push({
        name: 'api-auth',
        verdict: status === 'active' ? 'PASS' : 'WARN',
        detail: `@${me.handle} status=${status} (${Date.now() - started}ms, ${identity.apiBase})`,
      })
    } catch (err) {
      checks.push({ name: 'api-auth', verdict: 'FAIL', detail: `getMe failed: ${String(err)}` })
    }

    try {
      const rows = await syncPeek({ apiKey: identity.apiKey, apiBase: identity.apiBase }, { limit: 5 })
      checks.push({
        name: 'sync-wire',
        verdict: 'PASS',
        detail: `peek ok, ${rows.length}${rows.length === 5 ? '+' : ''} undelivered queued`,
      })
    } catch (err) {
      checks.push({ name: 'sync-wire', verdict: 'FAIL', detail: `sync peek failed: ${String(err)}` })
    }
  }

  for (const platform of ['claude-code', 'codex'] as const) {
    const file = anchorFilePath(platform)
    if (file === null) continue
    const hostDir = path.dirname(file) // NOT '/'-slicing — Windows paths use backslashes
    if (!fs.existsSync(hostDir)) {
      checks.push({ name: `anchor-${platform}`, verdict: 'PASS', detail: `${hostDir} absent (host not installed) — skipped` })
    } else {
      checks.push({
        name: `anchor-${platform}`,
        verdict: hasAnchor(platform) ? 'PASS' : 'WARN',
        detail: hasAnchor(platform)
          ? `identity block present in ${file}`
          : `no identity block in ${file} — run \`agentchat anchor install --platform ${platform}\``,
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
