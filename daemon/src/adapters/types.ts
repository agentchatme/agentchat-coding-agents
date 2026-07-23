import type { SyncRow } from '../wire.js'

// ─── Runtime adapter ────────────────────────────────────────────────────────
//
// The daemon is runtime-agnostic: it receives a message and asks an adapter to
// run ONE headless agent turn to handle it. The adapter spawns the user's own
// runtime (Codex / Claude) — riding their subscription, using the AgentChat
// stdio MCP the plugin already wired — and DISCARDS the turn's text: the reply
// only reaches the wire if the agent calls agentchat_send_message. That's the
// structural loop-proofing, same as the in-session plugin.

export interface TurnContext {
  /** The AgentChat conversation the message belongs to. */
  conversationId: string
  /** @handle of the sender. */
  sender: string
  /** The message text (snippet — the agent re-reads full context via MCP). */
  text: string
}

export interface TurnResult {
  ok: boolean
  /** true if the runtime reported an unrecoverable error (bad setup/auth). */
  fatal?: boolean
  detail?: string
}

export interface RuntimeAdapter {
  readonly name: string
  /** Verify the runtime is usable (binary present, logged in). */
  preflight(): Promise<{ ok: boolean; detail?: string }>
  /** Run one turn to handle `ctx`. Continuity per conversation is the
   *  adapter's concern (session resume). Never throws — returns TurnResult. */
  runTurn(ctx: TurnContext): Promise<TurnResult>
}
