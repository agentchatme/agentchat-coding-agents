import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  installService,
  disableService,
  enableService,
  uninstallService,
  serviceStatus,
} from '../src/service.js'

// REAL Windows install mechanics — runs ONLY on a windows-latest runner (see
// .github/workflows/windows-service.yml); skipped everywhere else. Verifies the
// Startup-folder file operations + toggle semantics on actual Windows, where
// path resolution is the one Windows-specific risk the Linux box can't check.
// USERPROFILE is redirected to a temp dir so the real Startup folder is
// untouched, and AGENTCHATD_SERVICE_NO_START stops it launching the loop.

const opts = { runtime: 'claude-code' as const, home: 'C:\\Users\\x\\.claude\\agentchat' }

describe.skipIf(process.platform !== 'win32')('Windows service mechanics (win32 only)', () => {
  let home: string
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'acd-win-'))
    for (const k of ['USERPROFILE', 'AGENTCHATD_SERVICE_NO_START']) saved[k] = process.env[k]
    process.env['USERPROFILE'] = home
    process.env['AGENTCHATD_SERVICE_NO_START'] = '1'
  })
  afterEach(() => {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
    try {
      fs.rmSync(home, { recursive: true, force: true })
    } catch {
      /* best-effort */
    }
  })

  const masterVbs = (): string => path.join(home, '.agentchat', 'daemon', 'agentchatd-claude-code.vbs')
  const startupVbs = (): string =>
    path.join(
      home,
      'AppData',
      'Roaming',
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup',
      'agentchatd-claude-code.vbs',
    )

  it('install → writes the master + Startup launcher, marked enabled', () => {
    installService(opts)
    expect(fs.existsSync(masterVbs())).toBe(true)
    expect(fs.existsSync(startupVbs())).toBe(true)
    expect(serviceStatus(opts)).toContain('enabled')
    expect(fs.readFileSync(startupVbs(), 'utf8')).toContain('start --runtime claude-code')
  })

  it('disable → drops the Startup copy, keeps the master (session-only)', () => {
    installService(opts)
    disableService(opts)
    expect(fs.existsSync(startupVbs())).toBe(false)
    expect(fs.existsSync(masterVbs())).toBe(true)
    expect(serviceStatus(opts)).toContain('disabled')
  })

  it('enable → restores the Startup copy', () => {
    installService(opts)
    disableService(opts)
    enableService(opts)
    expect(fs.existsSync(startupVbs())).toBe(true)
    expect(serviceStatus(opts)).toContain('enabled')
  })

  it('uninstall → removes both', () => {
    installService(opts)
    uninstallService(opts)
    expect(fs.existsSync(masterVbs())).toBe(false)
    expect(fs.existsSync(startupVbs())).toBe(false)
    expect(serviceStatus(opts)).toContain('not installed')
  })
})
