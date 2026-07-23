import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  installCodex,
  removeCodex,
  upsertTomlBlock,
  stripTomlBlock,
  hasUnfencedAgentchatServer,
  mergeHooks,
  unmergeHooks,
  codexConfigPath,
  codexHooksPath,
  stableBundlePath,
} from '../src/lib/codex-config.js'

let home: string
let codex: string
let agentchat: string
let bundleSrc: string

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-codex-'))
  codex = path.join(home, '.codex')
  agentchat = path.join(home, '.agentchat')
  process.env['CODEX_HOME'] = codex
  process.env['AGENTCHAT_HOME'] = agentchat
  process.env['HOME'] = home // anchor/removeAnchor resolve os.homedir via HOME on POSIX
  // a fake CLI bundle to copy into place
  bundleSrc = path.join(home, 'fake-cli.mjs')
  fs.writeFileSync(bundleSrc, '#!/usr/bin/env node\nconsole.log("fake")\n')
})

afterEach(() => {
  delete process.env['CODEX_HOME']
  delete process.env['AGENTCHAT_HOME']
  delete process.env['HOME']
  fs.rmSync(home, { recursive: true, force: true })
})

describe('TOML fenced block', () => {
  it('appends to an empty file and strips back to empty', () => {
    const withBlock = upsertTomlBlock('', '# agentchat:start\n[mcp_servers.agentchat]\n# agentchat:end')
    expect(withBlock).toContain('[mcp_servers.agentchat]')
    expect(stripTomlBlock(withBlock)).toBe('')
  })

  it('preserves surrounding user TOML byte-for-byte on strip', () => {
    const user = '# my codex config\nmodel = "gpt-5.6"\n\n[mcp_servers.other]\ncommand = "foo"\n'
    const withBlock = upsertTomlBlock(user, '# agentchat:start\nX=1\n# agentchat:end')
    expect(withBlock).toContain('model = "gpt-5.6"')
    expect(withBlock).toContain('[mcp_servers.other]')
    // strip returns the user content intact
    const stripped = stripTomlBlock(withBlock)
    expect(stripped).toContain('model = "gpt-5.6"')
    expect(stripped).toContain('[mcp_servers.other]')
    expect(stripped).not.toContain('X=1')
  })

  it('is idempotent — re-upsert replaces, never duplicates', () => {
    const once = upsertTomlBlock('base=1\n', '# agentchat:start\nA=1\n# agentchat:end')
    const twice = upsertTomlBlock(once, '# agentchat:start\nB=2\n# agentchat:end')
    expect(twice.match(/# agentchat:start/g)).toHaveLength(1)
    expect(twice).toContain('B=2')
    expect(twice).not.toContain('A=1')
  })

  it('detects an unfenced user [mcp_servers.agentchat]', () => {
    expect(hasUnfencedAgentchatServer('[mcp_servers.agentchat]\ncommand="x"\n')).toBe(true)
    expect(hasUnfencedAgentchatServer('[mcp_servers.other]\n')).toBe(false)
    // our own fenced block must NOT count as unfenced
    const ours = upsertTomlBlock('', '# agentchat:start\n[mcp_servers.agentchat]\n# agentchat:end')
    expect(hasUnfencedAgentchatServer(ours)).toBe(false)
  })
})

describe('hooks.json merge', () => {
  const BUNDLE = '/home/u/.agentchat/bin/agentchat.mjs'

  it('adds our three events to an empty doc', () => {
    const doc = mergeHooks(null, BUNDLE)
    expect(Object.keys(doc.hooks!)).toEqual(
      expect.arrayContaining(['SessionStart', 'UserPromptSubmit', 'Stop']),
    )
    expect(JSON.stringify(doc)).toContain('hook session-start --platform codex')
  })

  it('preserves the user\'s existing hooks and adds ours alongside', () => {
    const userDoc = {
      hooks: {
        SessionStart: [{ hooks: [{ type: 'command', command: 'user-thing.sh' }] }],
        PreToolUse: [{ hooks: [{ type: 'command', command: 'user-guard.sh' }] }],
      },
    }
    const merged = mergeHooks(structuredClone(userDoc), BUNDLE)
    // user's SessionStart entry survives, ours is appended
    const ss = JSON.stringify(merged.hooks!['SessionStart'])
    expect(ss).toContain('user-thing.sh')
    expect(ss).toContain('session-start --platform codex')
    // user's unrelated event untouched
    expect(JSON.stringify(merged.hooks!['PreToolUse'])).toContain('user-guard.sh')
  })

  it('re-merge is idempotent (no duplicate ours)', () => {
    const once = mergeHooks(null, BUNDLE)
    const twice = mergeHooks(structuredClone(once), BUNDLE)
    expect(twice.hooks!['Stop']!.filter((g) => JSON.stringify(g).includes('--platform codex'))).toHaveLength(1)
  })

  it('unmerge removes exactly ours, keeps the user\'s, and nulls when empty', () => {
    const userPlusOurs = mergeHooks(
      { hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'user-thing.sh' }] }] } },
      BUNDLE,
    )
    const after = unmergeHooks(structuredClone(userPlusOurs))!
    expect(JSON.stringify(after)).toContain('user-thing.sh')
    expect(JSON.stringify(after)).not.toContain('--platform codex')

    // ours-only → unmerge yields null (caller deletes the file)
    const oursOnly = mergeHooks(null, BUNDLE)
    expect(unmergeHooks(oursOnly)).toBeNull()
  })
})

describe('installCodex end to end', () => {
  it('writes config.toml, hooks.json, AGENTS.md, and a stable bundle copy', () => {
    const { actions, warnings } = installCodex(bundleSrc, 'codex-agent')
    expect(warnings).toEqual([])

    // config.toml
    const cfg = fs.readFileSync(codexConfigPath(), 'utf-8')
    expect(cfg).toContain('[mcp_servers.agentchat]')
    expect(cfg).toContain('default_tools_approval_mode = "approve"')
    // The MCP server is bound to the CODEX-SCOPED identity home (so the
    // Codex agent is distinct from a Claude agent). No secret is written —
    // the key lives in that home's credentials file.
    expect(cfg).toContain('[mcp_servers.agentchat.env]')
    expect(cfg).toContain(path.join(codex, 'agentchat')) // AGENTCHAT_HOME = <codex>/agentchat
    expect(cfg).not.toMatch(/AGENTCHAT_API_KEY\s*=\s*"/) // no inline key value

    // hooks.json points at the stable bundle
    const hooks = fs.readFileSync(codexHooksPath(), 'utf-8')
    expect(hooks).toContain(stableBundlePath())
    expect(hooks).toContain('session-start --platform codex')
    expect(hooks).toContain('stop --platform codex')
    expect(hooks).toContain('user-prompt --platform codex')

    // AGENTS.md carries identity + the loop-safety doctrine
    const agents = fs.readFileSync(path.join(codex, 'AGENTS.md'), 'utf-8')
    expect(agents).toContain('@codex-agent')
    expect(agents).toContain('silence is always a valid answer')
    expect(agents).toMatch(/loop everyone fears/)

    // bundle copied to a stable path
    expect(fs.existsSync(stableBundlePath())).toBe(true)
    expect(actions.some((a) => a.includes('bundle'))).toBe(true)
  })

  it('is merge-safe against a pre-existing user config + hooks', () => {
    fs.mkdirSync(codex, { recursive: true })
    fs.writeFileSync(codexConfigPath(), 'model = "gpt-5.6"\n\n[mcp_servers.linear]\ncommand = "x"\n')
    fs.writeFileSync(
      codexHooksPath(),
      JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'mine.sh' }] }] } }),
    )
    const { warnings } = installCodex(bundleSrc, 'codex-agent')
    expect(warnings).toEqual([])
    const cfg = fs.readFileSync(codexConfigPath(), 'utf-8')
    expect(cfg).toContain('[mcp_servers.linear]') // user's other server survives
    expect(cfg).toContain('[mcp_servers.agentchat]')
    const hooks = fs.readFileSync(codexHooksPath(), 'utf-8')
    expect(hooks).toContain('mine.sh') // user's hook survives
    expect(hooks).toContain('--platform codex')
  })

  it('warns (does not clobber) when the user has their own unfenced agentchat server', () => {
    fs.mkdirSync(codex, { recursive: true })
    fs.writeFileSync(codexConfigPath(), '[mcp_servers.agentchat]\ncommand = "their-own"\n')
    const { warnings } = installCodex(bundleSrc, 'codex-agent')
    expect(warnings.some((w) => w.includes('outside our block'))).toBe(true)
    expect(fs.readFileSync(codexConfigPath(), 'utf-8')).toContain('their-own')
  })

  it('removeCodex reverses everything, preserving user content', () => {
    fs.mkdirSync(codex, { recursive: true })
    fs.writeFileSync(codexConfigPath(), '[mcp_servers.linear]\ncommand = "x"\n')
    fs.writeFileSync(
      codexHooksPath(),
      JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'mine.sh' }] }] } }),
    )
    installCodex(bundleSrc, 'codex-agent')
    const removed = removeCodex()
    expect(removed.length).toBeGreaterThan(0)
    const cfg = fs.readFileSync(codexConfigPath(), 'utf-8')
    expect(cfg).toContain('[mcp_servers.linear]')
    expect(cfg).not.toContain('[mcp_servers.agentchat]')
    const hooks = fs.readFileSync(codexHooksPath(), 'utf-8')
    expect(hooks).toContain('mine.sh')
    expect(hooks).not.toContain('--platform codex')
    expect(fs.readFileSync(path.join(codex, 'AGENTS.md'), 'utf-8')).not.toContain('@codex-agent')
  })

  it('half-wires nothing when no identity: writes config+hooks but warns about AGENTS.md', () => {
    const { warnings } = installCodex(bundleSrc, null)
    expect(fs.existsSync(codexConfigPath())).toBe(true) // config + hooks still land
    expect(warnings.some((w) => w.includes('no identity'))).toBe(true)
    expect(fs.existsSync(path.join(codex, 'AGENTS.md'))).toBe(false)
  })
})
