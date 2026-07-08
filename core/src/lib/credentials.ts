import * as fs from 'node:fs'
import { z } from 'zod'
import { atomicWriteFile, readJsonFile } from './fsutil.js'
import { log } from './log.js'
import { credentialsPath, pendingPath } from './paths.js'

// ─── Identity resolution ────────────────────────────────────────────────────
//
// Precedence mirrors the Hermes plugin: explicit env var wins over the
// credentials file. The env path exists for CI and for users who manage
// secrets externally; the file is what the wizard writes and what all
// three coding-agent plugins share (one identity per machine).

export const DEFAULT_API_BASE = 'https://api.agentchat.me'

const CredentialsSchema = z.object({
  api_key: z.string().min(20),
  handle: z.string().min(3),
  api_base: z.string().url().optional(),
  created_at: z.string().optional(),
})

export type Credentials = z.infer<typeof CredentialsSchema>

export interface ResolvedIdentity {
  apiKey: string
  apiBase: string
  /** Handle is only known when it came from the credentials file. */
  handle: string | null
  source: 'env' | 'file'
}

export function readCredentialsFile(): Credentials | null {
  const raw = readJsonFile<unknown>(credentialsPath())
  if (raw === null) return null
  const parsed = CredentialsSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function resolveIdentity(): ResolvedIdentity | null {
  const envKey = process.env['AGENTCHAT_API_KEY']
  const envBase = process.env['AGENTCHAT_API_BASE']
  const file = readCredentialsFile()

  if (envKey && envKey.trim().length >= 20) {
    return {
      apiKey: envKey.trim(),
      apiBase: envBase?.trim() || file?.api_base || DEFAULT_API_BASE,
      handle: file?.handle ?? null,
      source: 'env',
    }
  }

  // A SET-but-malformed env key silently losing to the file would be an
  // unnoticed identity swap on a messaging platform — say it on stderr.
  if (envKey && envKey.trim().length > 0 && file) {
    log.warn(
      'AGENTCHAT_API_KEY is set but malformed (under 20 chars); using the credentials-file identity instead',
    )
  }

  if (file) {
    return {
      apiKey: file.api_key,
      apiBase: envBase?.trim() || file.api_base || DEFAULT_API_BASE,
      handle: file.handle,
      source: 'file',
    }
  }

  return null
}

export function writeCredentials(creds: Credentials): void {
  atomicWriteFile(credentialsPath(), JSON.stringify(creds, null, 2) + '\n', 0o600)
}

export function clearCredentials(): boolean {
  let removed = false
  for (const p of [credentialsPath(), pendingPath()]) {
    try {
      fs.unlinkSync(p)
      removed = true
    } catch {
      // absent is fine
    }
  }
  return removed
}

// ─── Pending registration (between `register` and `register --code`) ───────

const PendingSchema = z.object({
  // 'register' creates a new agent; 'recover' re-keys an existing one.
  // Both share the two-invocation OTP shape, so they share this file —
  // the kind guard stops `register --code` completing a recovery (and
  // vice versa) with confusing results.
  kind: z.enum(['register', 'recover']).default('register'),
  pending_id: z.string().min(1),
  email: z.string().email(),
  handle: z.string().min(3).optional(),
  api_base: z.string().url().optional(),
  created_at: z.string(),
})

export type PendingRegistration = z.infer<typeof PendingSchema>

export function readPending(): PendingRegistration | null {
  const raw = readJsonFile<unknown>(pendingPath())
  if (raw === null) return null
  const parsed = PendingSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function writePending(pending: PendingRegistration): void {
  atomicWriteFile(pendingPath(), JSON.stringify(pending, null, 2) + '\n', 0o600)
}

export function clearPending(): void {
  try {
    fs.unlinkSync(pendingPath())
  } catch {
    // absent is fine
  }
}
