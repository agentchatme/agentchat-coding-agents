import { installAnchor, removeAnchor } from '../lib/anchor.js'
import { resolveIdentity } from '../lib/credentials.js'
import type { Platform } from '../lib/dialect.js'

export async function runAnchor(
  action: 'install' | 'remove',
  platform: Platform,
): Promise<number> {
  if (action === 'remove') {
    const result = removeAnchor(platform)
    console.log(
      result.action === 'unsupported'
        ? `${platform} has no global instruction file — nothing to remove (identity is injected per-session there).`
        : `anchor ${platform}: ${result.action}${result.path ? ` (${result.path})` : ''}`,
    )
    return 0
  }

  const identity = resolveIdentity()
  if (identity === null || identity.handle === null) {
    console.error('No identity with a known handle on this machine — run `agentchat register` or `agentchat login` first.')
    return 1
  }
  const result = installAnchor(platform, identity.handle)
  console.log(
    result.action === 'unsupported'
      ? `${platform} has no global instruction file — the plugin rule + session hook cover identity there instead.`
      : `anchor ${platform}: ${result.action} (${result.path})`,
  )
  return 0
}
