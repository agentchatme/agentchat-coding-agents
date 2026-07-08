// ─── Platform hook dialects ─────────────────────────────────────────────────
//
// The ONLY per-platform code in the whole product: how each host wants
// hook output shaped. Everything upstream (sync, digest, caps) is shared.
// Golden-fixture tests pin these shapes so a host-side rename shows up as
// a red test instead of a silent no-op in the field.
//
// Sources (verified 2026-07-07):
//   Claude Code — SessionStart additionalContext via hookSpecificOutput;
//                 Stop continues with {decision:"block", reason}.
//   Codex       — hooks GA 2026-05: same field shapes as Claude Code.
//   Cursor      — sessionStart returns {additional_context}; stop returns
//                 {followup_message} (documented as loop automation).
//
// A `null` from either builder means "no action": the command prints
// nothing and exits 0, which every host treats as a no-op.

export const PLATFORMS = ['claude-code', 'codex', 'cursor'] as const
export type Platform = (typeof PLATFORMS)[number]

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value)
}

export function sessionStartOutput(platform: Platform, context: string): Record<string, unknown> {
  switch (platform) {
    case 'claude-code':
    case 'codex':
      return {
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: context,
        },
      }
    case 'cursor':
      return { additional_context: context }
  }
}

export function stopOutput(platform: Platform, reason: string): Record<string, unknown> {
  switch (platform) {
    case 'claude-code':
    case 'codex':
      return { decision: 'block', reason }
    case 'cursor':
      return { followup_message: reason }
  }
}
