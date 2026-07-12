import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  ANCHOR_START,
  ANCHOR_END,
  renderAnchorBlock,
  upsertAnchorBlock,
  stripAnchorBlock,
  installAnchor,
  removeAnchor,
  hasAnchor,
  anchorFilePath,
} from '../src/lib/anchor.js'

// installAnchor resolves through os.homedir(), which honors $HOME on
// POSIX and %USERPROFILE% on Windows — point BOTH at a scratch dir per
// test so no run on any platform can touch the real ~.
let home: string
const originalHome = process.env['HOME']
const originalUserProfile = process.env['USERPROFILE']

function restoreEnv(name: string, value: string | undefined): void {
  // `process.env[x] = undefined` stores the string "undefined" — delete instead.
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-anchor-'))
  process.env['HOME'] = home
  process.env['USERPROFILE'] = home
})

afterEach(() => {
  restoreEnv('HOME', originalHome)
  restoreEnv('USERPROFILE', originalUserProfile)
  fs.rmSync(home, { recursive: true, force: true })
})

describe('renderAnchorBlock', () => {
  it('contains the fenced markers and the literal handle', () => {
    const block = renderAnchorBlock('tessera-rho')
    expect(block.startsWith(ANCHOR_START)).toBe(true)
    expect(block.endsWith(ANCHOR_END)).toBe(true)
    expect(block).toContain('@tessera-rho')
  })
})

describe('upsertAnchorBlock', () => {
  it('appends to an empty file', () => {
    const next = upsertAnchorBlock('', renderAnchorBlock('a-b'))
    expect(next).toContain(ANCHOR_START)
    expect(next.endsWith('\n')).toBe(true)
  })

  it('preserves surrounding user content', () => {
    const existing = '# My instructions\n\nBe nice.\n'
    const next = upsertAnchorBlock(existing, renderAnchorBlock('a-b'))
    expect(next).toContain('# My instructions')
    expect(next).toContain('Be nice.')
    expect(next).toContain('@a-b')
  })

  it('is idempotent — re-upserting replaces instead of duplicating', () => {
    const once = upsertAnchorBlock('# Doc\n', renderAnchorBlock('first'))
    const twice = upsertAnchorBlock(once, renderAnchorBlock('second'))
    expect(twice).not.toContain('@first')
    expect(twice).toContain('@second')
    expect(twice.match(new RegExp(ANCHOR_START, 'g'))).toHaveLength(1)
  })

  it('migrates a legacy agentchat-skill block', () => {
    const legacy = '<!-- agentchat-skill:start -->\nold stuff\n<!-- agentchat-skill:end -->\n'
    const next = upsertAnchorBlock(legacy, renderAnchorBlock('fresh'))
    expect(next).not.toContain('agentchat-skill:start')
    expect(next).not.toContain('old stuff')
    expect(next).toContain('@fresh')
  })

  it('ignores markers quoted inside user prose — never eats the content after them', () => {
    const existing = [
      'My notes: the plugin fences its block with <!-- agentchat:start --> markers.',
      '',
      'IMPORTANT USER CONTENT HERE',
      '',
      renderAnchorBlock('old-handle'),
      '',
    ].join('\n')
    const next = upsertAnchorBlock(existing, renderAnchorBlock('new-handle'))
    expect(next).toContain('IMPORTANT USER CONTENT HERE')
    expect(next).toContain('the plugin fences its block')
    expect(next).toContain('@new-handle')
    expect(next).not.toContain('@old-handle')
    const stripped = stripAnchorBlock(next)
    expect(stripped).toContain('IMPORTANT USER CONTENT HERE')
    expect(stripped).not.toContain('@new-handle')
  })

  it('does not accumulate blocks when the file contains mangled (reversed) markers', () => {
    const mangled = `${ANCHOR_END}\nweird leftover\n`
    const once = upsertAnchorBlock(mangled, renderAnchorBlock('a'))
    const twice = upsertAnchorBlock(once, renderAnchorBlock('b'))
    const thrice = upsertAnchorBlock(twice, renderAnchorBlock('c'))
    expect(thrice.match(new RegExp(ANCHOR_START, 'g'))?.length ?? 0).toBeLessThanOrEqual(1)
    expect(thrice).toContain('@c')
    expect(thrice).not.toContain('@a')
    expect(thrice).not.toContain('@b')
  })

  it('converges a file that somehow holds multiple well-formed blocks back to one', () => {
    const doubled = [renderAnchorBlock('one'), '', renderAnchorBlock('two'), ''].join('\n')
    const next = upsertAnchorBlock(doubled, renderAnchorBlock('final'))
    expect(next.match(new RegExp(ANCHOR_START, 'g'))).toHaveLength(1)
    expect(next).toContain('@final')
  })
})

describe('stripAnchorBlock', () => {
  it('removes the block and keeps user content intact', () => {
    const content = upsertAnchorBlock('# Keep me\n', renderAnchorBlock('gone'))
    const stripped = stripAnchorBlock(content)
    expect(stripped).toContain('# Keep me')
    expect(stripped).not.toContain(ANCHOR_START)
    expect(stripped).not.toContain('@gone')
  })

  it('is a no-op without markers', () => {
    expect(stripAnchorBlock('plain file\n')).toBe('plain file\n')
  })
})

describe('installAnchor / removeAnchor', () => {
  it('writes into ~/.claude/CLAUDE.md for claude-code and verifies the handle landed', () => {
    const result = installAnchor('claude-code', 'demo-agent')
    expect(result.action).toBe('written')
    const file = anchorFilePath('claude-code')!
    expect(fs.readFileSync(file, 'utf-8')).toContain('@demo-agent')
    expect(hasAnchor('claude-code')).toBe(true)
  })

  it('writes into ~/.codex/AGENTS.md for codex', () => {
    const result = installAnchor('codex', 'demo-agent')
    expect(result.path).toBe(path.join(home, '.codex', 'AGENTS.md'))
    expect(result.action).toBe('written')
  })

  it('reports cursor as unsupported without touching disk', () => {
    expect(installAnchor('cursor', 'demo-agent').action).toBe('unsupported')
    expect(removeAnchor('cursor').action).toBe('unsupported')
  })

  it('remove round-trips cleanly and preserves other content', () => {
    const file = anchorFilePath('claude-code')!
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, '# Mine\n')
    installAnchor('claude-code', 'demo-agent')
    const removal = removeAnchor('claude-code')
    expect(removal.action).toBe('removed')
    const after = fs.readFileSync(file, 'utf-8')
    expect(after).toContain('# Mine')
    expect(after).not.toContain('@demo-agent')
    expect(removeAnchor('claude-code').action).toBe('noop')
  })
})
