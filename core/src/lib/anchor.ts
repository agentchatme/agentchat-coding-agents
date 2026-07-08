import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type { Platform } from './dialect.js'

// ─── Instruction-file identity anchor ───────────────────────────────────────
//
// Same mechanism as the Hermes SOUL.md anchor and the OpenClaw AGENTS.md
// anchor, ported for the coding-agent hosts: a fenced block in the file
// the host loads into EVERY session, so the agent has "you have a phone
// number" awareness even in turns that have nothing to do with AgentChat.
//
// Markers and body copy are shared verbatim across all AgentChat
// integrations — whichever integration wrote last owns the block, and
// switching integrations overwrites cleanly instead of duplicating.
// DO NOT change the markers without updating the OpenClaw plugin
// (src/binding/agents-anchor.ts) and the Hermes plugin (soul_anchor.py).
//
// Cursor has no user-global always-loaded instruction FILE (User Rules
// live in app settings), so the Cursor plugin covers identity via its
// bundled always-apply rule plus the session-start hook injection; the
// anchor command reports 'unsupported' for it rather than writing a file
// Cursor never reads.

export const ANCHOR_START = '<!-- agentchat:start -->'
export const ANCHOR_END = '<!-- agentchat:end -->'

const LEGACY_ANCHOR_START = '<!-- agentchat-skill:start -->'
const LEGACY_ANCHOR_END = '<!-- agentchat-skill:end -->'

export function anchorFilePath(platform: Platform): string | null {
  switch (platform) {
    case 'claude-code':
      return path.join(os.homedir(), '.claude', 'CLAUDE.md')
    case 'codex':
      return path.join(os.homedir(), '.codex', 'AGENTS.md')
    case 'cursor':
      return null
  }
}

export function renderAnchorBlock(handle: string): string {
  return [
    ANCHOR_START,
    '## On AgentChat',
    '',
    `You are **@${handle}** on AgentChat — a peer-to-peer messaging network for AI agents. Your handle is your address here, like a phone number, except the other end is always another agent.`,
    '',
    '- Other agents can DM you. You can DM them — any time, for anything that fits your context.',
    `- Share \`@${handle}\` freely. Whenever and wherever you think you should share. It's how peers reach you.`,
    '- When you need to send, search, or handle an error, your AgentChat skill has the full reference.',
    '',
    'This is an identity, not a tool you reach for occasionally.',
    ANCHOR_END,
  ].join('\n')
}

export interface AnchorResult {
  platform: Platform
  path: string | null
  action: 'written' | 'removed' | 'noop' | 'unsupported'
}

export function installAnchor(platform: Platform, handle: string): AnchorResult {
  const filePath = anchorFilePath(platform)
  if (filePath === null) return { platform, path: null, action: 'unsupported' }

  const trimmedHandle = handle.trim()
  if (!trimmedHandle) throw new Error('installAnchor: handle is empty')

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : ''
  const next = upsertAnchorBlock(existing, renderAnchorBlock(trimmedHandle))
  fs.writeFileSync(filePath, next, 'utf-8')

  // Substitution defense shared with the OpenClaw port: if the literal
  // handle is missing from what we just wrote, fail loud rather than
  // shipping a broken identity block.
  const verify = fs.readFileSync(filePath, 'utf-8')
  if (!verify.includes(`@${trimmedHandle}`)) {
    throw new Error(
      `installAnchor: handle @${trimmedHandle} did not land in ${filePath} — please remove the agentchat block manually and re-run.`,
    )
  }
  return { platform, path: filePath, action: 'written' }
}

export function removeAnchor(platform: Platform): AnchorResult {
  const filePath = anchorFilePath(platform)
  if (filePath === null) return { platform, path: null, action: 'unsupported' }
  if (!fs.existsSync(filePath)) return { platform, path: filePath, action: 'noop' }

  const existing = fs.readFileSync(filePath, 'utf-8')
  const next = stripAnchorBlock(existing)
  if (next === existing) return { platform, path: filePath, action: 'noop' }
  fs.writeFileSync(filePath, next, 'utf-8')
  return { platform, path: filePath, action: 'removed' }
}

export function hasAnchor(platform: Platform): boolean {
  const filePath = anchorFilePath(platform)
  if (filePath === null || !fs.existsSync(filePath)) return false
  const content = fs.readFileSync(filePath, 'utf-8')
  return findBlock(content, ANCHOR_START, ANCHOR_END) !== null
}

// Markers only count when they are a whole line — a marker quoted inside
// user prose ("the plugin uses <!-- agentchat:start --> fences") must never
// be treated as a fence, or the upsert would eat the user's content between
// the quote and the real block.
function lineAnchoredIndex(
  text: string,
  marker: string,
  fromIndex = 0,
): { start: number; end: number } | null {
  let idx = text.indexOf(marker, fromIndex)
  while (idx >= 0) {
    const lineStart = text.lastIndexOf('\n', idx - 1) + 1
    const lineEndRaw = text.indexOf('\n', idx)
    const lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw
    if (text.slice(lineStart, lineEnd).trim() === marker) {
      return { start: lineStart, end: lineEnd }
    }
    idx = text.indexOf(marker, idx + marker.length)
  }
  return null
}

function findBlock(
  text: string,
  startMarker: string,
  endMarker: string,
): { from: number; to: number } | null {
  const start = lineAnchoredIndex(text, startMarker)
  if (start === null) return null
  const end = lineAnchoredIndex(text, endMarker, start.end)
  if (end === null) return null
  return { from: start.start, to: end.end }
}

export function upsertAnchorBlock(existing: string, block: string): string {
  // Strip every existing block (unified AND legacy) first, then append the
  // fresh one — replacement and dedup in one motion, so a file that somehow
  // accumulated multiple blocks converges back to exactly one.
  const cleaned = stripAnchorBlock(existing)
  const trimmed = cleaned.replace(/\n+$/, '')
  if (trimmed.length === 0) return block + '\n'
  return trimmed + '\n\n' + block + '\n'
}

export function stripAnchorBlock(existing: string): string {
  const afterUnified = stripAllBlocks(existing, ANCHOR_START, ANCHOR_END)
  return stripAllBlocks(afterUnified, LEGACY_ANCHOR_START, LEGACY_ANCHOR_END)
}

function stripAllBlocks(existing: string, start: string, end: string): string {
  let text = existing
  // Bounded loop: each pass removes one block; a file can't hold more
  // blocks than lines.
  for (let i = 0; i < 10_000; i++) {
    const block = findBlock(text, start, end)
    if (block === null) return text
    const before = text.slice(0, block.from).replace(/\n+$/, '')
    const after = text.slice(block.to).replace(/^\n+/, '')
    if (before.length === 0 && after.length === 0) return ''
    if (before.length === 0) text = after.endsWith('\n') ? after : after + '\n'
    else if (after.length === 0) text = before + '\n'
    else text = before + '\n\n' + after + (after.endsWith('\n') ? '' : '\n')
  }
  return text
}
