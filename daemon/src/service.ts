import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { log } from './log.js'
import type { Runtime } from './config.js'

// ─── Service lifecycle (systemd / launchd) ──────────────────────────────────
//
// `agentchatd start` only runs while the shell is open — no good for a 24/7
// consumer product. `install` registers the daemon as a real background
// service that starts on boot/login and restarts on crash:
//   * Linux  → a systemd USER unit + `loginctl enable-linger` (so it runs
//              without an active login session — the VPS case).
//   * macOS  → a launchd LaunchAgent with KeepAlive + RunAtLoad.
// One service per runtime (the leader lock already enforces one daemon per
// identity on a box), labelled by runtime so codex + claude-code coexist.

export interface ServiceOpts {
  runtime: Runtime
  home: string
}

interface Plan {
  label: string // service/unit name
  node: string // absolute node path
  bin: string // absolute daemon entry (dist/index.js)
  home: string
  runtime: Runtime
  /** Runtime-home env captured from the current shell so the service sees the
   *  same CODEX_HOME / CLAUDE_CONFIG_DIR the user installed under. */
  env: Record<string, string>
}

export function planForTest(opts: ServiceOpts): Plan {
  return plan(opts)
}

function plan(opts: ServiceOpts): Plan {
  const env: Record<string, string> = {}
  // CRITICAL: a systemd/launchd service does NOT inherit the login shell's
  // PATH, so it can't find `claude` / `codex` / `npx` (often in ~/.local/bin
  // or a version-manager dir). Capture the installer's PATH so the service
  // resolves the same binaries the user does. (Without this the daemon exits
  // "claude CLI not found on PATH" and restart-loops.)
  if (process.env['PATH']) env['PATH'] = process.env['PATH']
  if (opts.runtime === 'codex' && process.env['CODEX_HOME']) env['CODEX_HOME'] = process.env['CODEX_HOME']
  if (opts.runtime === 'claude-code' && process.env['CLAUDE_CONFIG_DIR'])
    env['CLAUDE_CONFIG_DIR'] = process.env['CLAUDE_CONFIG_DIR']
  return {
    label: `agentchatd-${opts.runtime}`,
    node: process.execPath,
    bin: process.argv[1] ?? '',
    home: path.resolve(opts.home),
    runtime: opts.runtime,
    env,
  }
}

function run(cmd: string, args: string[]): { ok: boolean; out: string } {
  const r = spawnSync(cmd, args, { encoding: 'utf-8' })
  return { ok: !r.error && r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
}

// ─── systemd (Linux) ─────────────────────────────────────────────────────────

function systemdUnitPath(label: string): string {
  return path.join(os.homedir(), '.config', 'systemd', 'user', `${label}.service`)
}

function systemdUnit(p: Plan): string {
  const envLines = Object.entries(p.env)
    .map(([k, v]) => `Environment=${k}=${v}`)
    .join('\n')
  return [
    '[Unit]',
    `Description=AgentChat always-on daemon (${p.runtime})`,
    'After=network-online.target',
    'Wants=network-online.target',
    '',
    '[Service]',
    'Type=simple',
    `ExecStart=${p.node} ${p.bin} start --runtime ${p.runtime} --home ${p.home}`,
    ...(envLines ? [envLines] : []),
    'Restart=on-failure',
    'RestartSec=5',
    '',
    '[Install]',
    'WantedBy=default.target',
    '',
  ].join('\n')
}

function installSystemd(p: Plan): void {
  const unitPath = systemdUnitPath(p.label)
  fs.mkdirSync(path.dirname(unitPath), { recursive: true })
  fs.writeFileSync(unitPath, systemdUnit(p))
  log.info(`wrote ${unitPath}`)
  run('systemctl', ['--user', 'daemon-reload'])
  // enable-linger keeps user services running with no active login (VPS).
  const linger = run('loginctl', ['enable-linger', os.userInfo().username])
  if (!linger.ok) {
    log.warn(`could not enable-linger (service won't survive logout until you run: sudo loginctl enable-linger ${os.userInfo().username})`)
  }
  const enabled = run('systemctl', ['--user', 'enable', '--now', p.label])
  if (!enabled.ok) throw new Error(`systemctl enable failed: ${enabled.out}`)
  log.info(`service ${p.label} enabled + started`)
}

function uninstallSystemd(label: string): void {
  run('systemctl', ['--user', 'disable', '--now', label])
  const unitPath = systemdUnitPath(label)
  if (fs.existsSync(unitPath)) fs.rmSync(unitPath)
  run('systemctl', ['--user', 'daemon-reload'])
  log.info(`service ${label} removed`)
}

function statusSystemd(label: string): string {
  const active = run('systemctl', ['--user', 'is-active', label]).out || 'unknown'
  const enabled = run('systemctl', ['--user', 'is-enabled', label]).out || 'unknown'
  return `systemd ${label}: ${active} (${enabled})`
}

// ─── launchd (macOS) ─────────────────────────────────────────────────────────

function launchdPlistPath(label: string): string {
  return path.join(os.homedir(), 'Library', 'LaunchAgents', `${launchdLabel(label)}.plist`)
}
const launchdLabel = (label: string): string => `me.agentchat.${label}`

function launchdPlist(p: Plan): string {
  const args = [p.node, p.bin, 'start', '--runtime', p.runtime, '--home', p.home]
  const argXml = args.map((a) => `    <string>${a}</string>`).join('\n')
  const envXml = Object.entries(p.env)
    .map(([k, v]) => `    <key>${k}</key><string>${v}</string>`)
    .join('\n')
  const logPath = path.join(p.home, 'daemon.log')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0"><dict>',
    `  <key>Label</key><string>${launchdLabel(p.label)}</string>`,
    '  <key>ProgramArguments</key><array>',
    argXml,
    '  </array>',
    ...(envXml ? ['  <key>EnvironmentVariables</key><dict>', envXml, '  </dict>'] : []),
    '  <key>RunAtLoad</key><true/>',
    '  <key>KeepAlive</key><true/>',
    `  <key>StandardErrorPath</key><string>${logPath}</string>`,
    `  <key>StandardOutPath</key><string>${logPath}</string>`,
    '</dict></plist>',
    '',
  ].join('\n')
}

function installLaunchd(p: Plan): void {
  const plistPath = launchdPlistPath(p.label)
  fs.mkdirSync(path.dirname(plistPath), { recursive: true })
  fs.writeFileSync(plistPath, launchdPlist(p))
  log.info(`wrote ${plistPath}`)
  run('launchctl', ['unload', plistPath]) // idempotent: clear a prior load
  const loaded = run('launchctl', ['load', '-w', plistPath])
  if (!loaded.ok) throw new Error(`launchctl load failed: ${loaded.out}`)
  log.info(`service ${launchdLabel(p.label)} loaded + started`)
}

function uninstallLaunchd(label: string): void {
  const plistPath = launchdPlistPath(label)
  run('launchctl', ['unload', '-w', plistPath])
  if (fs.existsSync(plistPath)) fs.rmSync(plistPath)
  log.info(`service ${launchdLabel(label)} removed`)
}

function statusLaunchd(label: string): string {
  const r = run('launchctl', ['list', launchdLabel(label)])
  return `launchd ${launchdLabel(label)}: ${r.ok ? 'loaded' : 'not loaded'}`
}

// ─── platform dispatch ───────────────────────────────────────────────────────

export function installService(opts: ServiceOpts): void {
  const p = plan(opts)
  if (!p.bin) throw new Error('could not resolve the daemon entrypoint (process.argv[1])')
  if (process.platform === 'linux') return installSystemd(p)
  if (process.platform === 'darwin') return installLaunchd(p)
  throw new Error(`service install is not supported on ${process.platform} — run \`agentchatd start\` under your own supervisor`)
}

export function uninstallService(opts: ServiceOpts): void {
  const label = `agentchatd-${opts.runtime}`
  if (process.platform === 'linux') return uninstallSystemd(label)
  if (process.platform === 'darwin') return uninstallLaunchd(label)
  throw new Error(`service uninstall is not supported on ${process.platform}`)
}

export function serviceStatus(opts: ServiceOpts): string {
  const label = `agentchatd-${opts.runtime}`
  if (process.platform === 'linux') return statusSystemd(label)
  if (process.platform === 'darwin') return statusLaunchd(label)
  return `service management not supported on ${process.platform}`
}
