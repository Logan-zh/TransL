import { execSync } from 'child_process'
import { existsSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'

/** Known registry value names from past app names / installers. */
const LEGACY_RUN_NAMES = [
  'TransL',
  'transl',
  'TransL Desktop',
  'DEMOL Desktop',
  'demol',
  'Electron'
]

const STARTUP_SHORTCUTS = ['TransL.lnk', 'TransL Desktop.lnk', 'DEMOL.lnk', 'demol.lnk']

function deleteRunValue(name: string): void {
  try {
    execSync(`reg delete "${RUN_KEY}" /v "${name}" /f`, { stdio: 'ignore' })
  } catch {
    // Entry may not exist.
  }
}

function listRunEntries(): Array<{ name: string; command: string }> {
  try {
    const output = execSync(`reg query "${RUN_KEY}"`, { encoding: 'utf8' })
    const entries: Array<{ name: string; command: string }> = []

    for (const line of output.split(/\r?\n/)) {
      const match = line.match(/^\s+(\S(?:.*\S)?)\s+REG_\w+\s+(.+)$/)
      if (!match) continue
      entries.push({ name: match[1].trim(), command: match[2].trim() })
    }

    return entries
  } catch {
    return []
  }
}

function isOurStartupCommand(command: string): boolean {
  const lower = command.toLowerCase()
  return lower.includes('demol.exe') || lower.includes('transl.exe')
}

/** Delete every HKCU Run entry that launches TransL / DEMOL (any install path or name). */
export function removeAllAppStartupEntries(): void {
  if (process.platform !== 'win32') return

  for (const name of LEGACY_RUN_NAMES) {
    deleteRunValue(name)
  }

  for (const entry of listRunEntries()) {
    if (isOurStartupCommand(entry.command)) {
      deleteRunValue(entry.name)
    }
  }

  removeStartupFolderShortcuts()
}

function removeStartupFolderShortcuts(): void {
  const startupDirs = [
    join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
  ]

  for (const dir of startupDirs) {
    if (!existsSync(dir)) continue

    for (const name of STARTUP_SHORTCUTS) {
      const path = join(dir, name)
      if (!existsSync(path)) continue
      try {
        unlinkSync(path)
      } catch {
        // Ignore locked shortcuts.
      }
    }

    try {
      for (const file of readdirSync(dir)) {
        if (!/\.lnk$/i.test(file)) continue
        const lower = file.toLowerCase()
        if (!lower.includes('demol') && !lower.includes('transl')) continue
        try {
          unlinkSync(join(dir, file))
        } catch {
          // Ignore locked shortcuts.
        }
      }
    } catch {
      // Ignore unreadable startup folder.
    }
  }
}
