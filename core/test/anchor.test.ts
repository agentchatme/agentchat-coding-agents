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
// POSIX — point it at a scratch dir per test.
let home: string
const originalHome = process.env['HOME']

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-anchor-'))
  process.env['HOME'] = home
})

afterEach(() => {
  process.env['HOME'] = originalHome
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
