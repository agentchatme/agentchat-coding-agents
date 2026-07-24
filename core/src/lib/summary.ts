import type { SyncRow } from './wire.js'

// ─── Unread digest formatting ───────────────────────────────────────────────
//
// Turns a batch of sync rows into the text that gets injected into the
// agent's context. The digest is deliberately factual — counts, senders,
// snippets — with a short skill-directed footer. Judgement about whether
// to reply lives in the etiquette skill, not here (same separation as the
// Hermes notification prompt: one line of fact, manual on demand).

interface ConversationDigest {
  conversationId: string
  isGroup: boolean
  senders: string[]
  count: number
  latestSnippet: string
}

const SNIPPET_MAX = 140

function snippetOf(row: SyncRow): string {
  const content = row.content ?? {}
  const text = typeof content['text'] === 'string' ? (content['text'] as string) : ''
  if (text.length === 0) return `[${row.type ?? 'message'}]`
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length > SNIPPET_MAX ? `${oneLine.slice(0, SNIPPET_MAX - 1)}…` : oneLine
}

export function digestConversations(rows: SyncRow[]): ConversationDigest[] {
  const byConversation = new Map<string, ConversationDigest>()
  for (const row of rows) {
    const sender = row.sender ?? row.sender_handle ?? 'unknown'
    const existing = byConversation.get(row.conversation_id)
    if (existing) {
      existing.count += 1
      if (!existing.senders.includes(sender)) existing.senders.push(sender)
      existing.latestSnippet = snippetOf(row) // rows arrive oldest-first; last write wins
    } else {
      byConversation.set(row.conversation_id, {
        conversationId: row.conversation_id,
        isGroup: row.conversation_id.startsWith('grp_'),
        senders: [sender],
        count: 1,
        latestSnippet: snippetOf(row),
      })
    }
  }
  return [...byConversation.values()]
}

function digestLines(digests: ConversationDigest[]): string[] {
  return digests.map((d, i) => {
    const who = d.senders.map((s) => `@${s}`).join(', ')
    const kind = d.isGroup ? `group ${d.conversationId}` : d.conversationId
    const count = d.count === 1 ? '1 message' : `${d.count} messages`
    return `${i + 1}. ${who} (${count}, ${kind}): "${d.latestSnippet}"`
  })
}

export function formatSessionStart(handle: string | null, rows: SyncRow[]): string {
  const digests = digestConversations(rows)
  const total = rows.length
  // Never assert a handle we don't actually know — an agent will repeat it.
  const identity = handle ? `You are @${handle} on AgentChat. ` : 'AgentChat: '
  const header =
    identity +
    `${total} unread message${total === 1 ? '' : 's'} in ${digests.length} conversation${digests.length === 1 ? '' : 's'}:`
  return [
    header,
    '',
    ...digestLines(digests),
    '',
    'Triage per your AgentChat skill: read a conversation with agentchat_get_conversation before replying; reply only where an open request is addressed to you; finished conversations get silence, not acknowledgments. Mention anything the user should know about.',
  ].join('\n')
}

export function formatStopPickup(handle: string | null, rows: SyncRow[]): string {
  const digests = digestConversations(rows)
  const total = rows.length
  const addressee = handle ? ` for @${handle}` : ''
  return [
    `While you were working, ${total} AgentChat message${total === 1 ? '' : 's'} arrived${addressee}:`,
    '',
    ...digestLines(digests),
    '',
    'Handle these per your AgentChat skill, then finish. Reply via agentchat_send_message only where warranted — if nothing is actionable, simply end the turn (silence is a valid outcome).',
  ].join('\n')
}

export function formatRegistrationOffer(cliPath?: string, platform?: string): string {
  // The plugin ships the CLI inside its own directory; until the user (or a
  // published npm package) puts `agentchat` on PATH, the only invocation
  // guaranteed to work on a fresh machine is the absolute path we are
  // running from right now.
  const invoke = cliPath ? `node "${cliPath}"` : 'agentchat'
  // `--platform` scopes THIS host's identity: the handle you register here
  // is this host's own agent, distinct from any other coding agent on the
  // machine, so they can message each other. Each host = its own account.
  const p = platform ? ` --platform ${platform}` : ''
  const hostNote = platform
    ? `This ${platform} agent gets its OWN handle (separate from any other coding agent on this machine — that's what lets them DM each other). Use an email not already tied to another agent.`
    : ''
  return [
    'The AgentChat plugin is installed but this agent has no AgentChat identity yet.',
    '',
    'AgentChat gives you (the agent) a handle other agents can DM, like a phone number. If the user would like that, offer to set it up conversationally:',
    ...(hostNote ? [hostNote] : []),
    '1. Ask for the email + desired handle (3–30 chars, lowercase letters/digits/hyphens, must start with a letter).',
    `2. Run: ${invoke} register${p} --email <email> --handle <handle>`,
    `3. A 6-digit code lands in their email; ask for it, then run: ${invoke} register${p} --code <code>`,
    `4. Then turn on always-on so you stay reachable when they're away — run: ${invoke} daemon install${p}. It's on by default; tell them in one line they can say "go session-only" any time to switch it off (that runs ${invoke} daemon disable${p}).`,
    '',
    'Do not push the initial handle offer — one short offer is plenty. If declined, drop the topic for the rest of the session.',
  ].join('\n')
}
