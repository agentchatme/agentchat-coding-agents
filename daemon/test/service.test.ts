import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  planForTest,
  isWslFromVersion,
  launcherVbs,
  winCommandNative,
  wslScriptContent,
} from '../src/service.js'

// A systemd/launchd service does NOT inherit the login shell's PATH, so it
// can't find claude/codex/npx unless we capture PATH into the unit. This bit
// once (the service restart-looped on "claude CLI not found"); guard it.

const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of ['PATH', 'CODEX_HOME', 'CLAUDE_CONFIG_DIR']) saved[k] = process.env[k]
})
afterEach(() => {
  for (const k of ['PATH', 'CODEX_HOME', 'CLAUDE_CONFIG_DIR']) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe('service plan env capture', () => {
  it('always captures PATH so the service can find claude/codex/npx', () => {
    process.env['PATH'] = '/home/me/.local/bin:/usr/bin'
    const p = planForTest({ runtime: 'claude-code', home: '/h' })
    expect(p.env['PATH']).toBe('/home/me/.local/bin:/usr/bin')
  })

  it('captures CLAUDE_CONFIG_DIR for the claude-code runtime', () => {
    process.env['CLAUDE_CONFIG_DIR'] = '/cfg'
    const p = planForTest({ runtime: 'claude-code', home: '/h' })
    expect(p.env['CLAUDE_CONFIG_DIR']).toBe('/cfg')
  })

  it('captures CODEX_HOME for the codex runtime (not CLAUDE_CONFIG_DIR)', () => {
    process.env['CODEX_HOME'] = '/codex'
    process.env['CLAUDE_CONFIG_DIR'] = '/cfg'
    const p = planForTest({ runtime: 'codex', home: '/h' })
    expect(p.env['CODEX_HOME']).toBe('/codex')
    expect(p.env['CLAUDE_CONFIG_DIR']).toBeUndefined()
  })

  it('labels the unit by runtime so codex + claude-code coexist', () => {
    expect(planForTest({ runtime: 'codex', home: '/h' }).label).toBe('agentchatd-codex')
    expect(planForTest({ runtime: 'claude-code', home: '/h' }).label).toBe('agentchatd-claude-code')
  })
})

describe('WSL detection', () => {
  it('recognizes a WSL kernel string', () => {
    expect(isWslFromVersion('Linux version 5.15.0-microsoft-standard-WSL2')).toBe(true)
    expect(isWslFromVersion('... Microsoft ...')).toBe(true)
  })
  it('rejects a native Linux kernel string', () => {
    expect(isWslFromVersion('Linux version 6.8.0-generic (gcc ...)')).toBe(false)
  })
})

describe('Windows launcher generators', () => {
  const p = planForTest({ runtime: 'claude-code', home: '/home/me/.claude/agentchat' })

  it('the VBScript runs hidden and restarts on exit', () => {
    const vbs = launcherVbs('"C:\\node.exe" "C:\\daemon.js" start', {})
    expect(vbs).toContain('CreateObject("WScript.Shell")')
    expect(vbs).toMatch(/sh\.Run ".*", 0, True/) // 0 = hidden window
    expect(vbs).toContain('Do')
    expect(vbs).toContain('Loop') // restart-on-exit loop
    expect(vbs).toContain('WScript.Sleep 5000')
    expect(vbs.endsWith('\r\n')).toBe(true) // CRLF for Windows
  })

  it('escapes embedded quotes so paths with spaces survive', () => {
    const vbs = launcherVbs('"C:\\Program Files\\node.exe" x', {})
    // Each " inside the VBScript string literal must be doubled.
    expect(vbs).toContain('""C:\\Program Files\\node.exe""')
  })

  it('sets captured env on the launcher process', () => {
    const vbs = launcherVbs('cmd', { CLAUDE_CONFIG_DIR: 'C:\\cfg' })
    expect(vbs).toContain('sh.Environment("Process").Item("CLAUDE_CONFIG_DIR") = "C:\\cfg"')
  })

  it('native command invokes node + daemon with the runtime + home', () => {
    const cmd = winCommandNative(p)
    expect(cmd).toContain('start --runtime claude-code --home "/home/me/.claude/agentchat"')
    expect(cmd).toContain(p.node)
    expect(cmd).toContain(p.bin)
  })

  it('WSL script is a login-shell bash that execs the daemon with exported env', () => {
    const sh = wslScriptContent(p)
    expect(sh.startsWith('#!/bin/bash')).toBe(true)
    expect(sh).toMatch(/export PATH=/) // captured PATH survives into WSL
    expect(sh).toContain('start --runtime claude-code')
    expect(sh).toContain("exec '") // single-quoted exec for path safety
  })
})
