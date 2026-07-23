// stderr-only structured-ish logging. stdout stays clean for anything that
// might parse it. Level via AGENTCHATD_LOG_LEVEL (default info).
const LEVELS = ['silent', 'error', 'warn', 'info', 'debug'] as const
type Level = (typeof LEVELS)[number]

function active(): number {
  const raw = (process.env['AGENTCHATD_LOG_LEVEL'] ?? 'info').toLowerCase()
  const i = LEVELS.indexOf(raw as Level)
  return i === -1 ? LEVELS.indexOf('info') : i
}

function emit(level: Level, msg: string): void {
  if (level !== 'silent' && LEVELS.indexOf(level) <= active()) {
    process.stderr.write(`${new Date().toISOString()} [${level}] ${msg}\n`)
  }
}

export const log = {
  error: (m: string) => emit('error', m),
  warn: (m: string) => emit('warn', m),
  info: (m: string) => emit('info', m),
  debug: (m: string) => emit('debug', m),
}
