import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

const LEGACY_DESKTOP_SHORTCUTS = ['TransL.lnk', 'TransL Desktop.lnk']

/** Remove old TransL desktop shortcuts left after rebrand to DEMOL. */
export function removeLegacyDesktopShortcuts(): void {
  if (process.platform !== 'win32') return

  const desktop = app.getPath('desktop')
  for (const name of LEGACY_DESKTOP_SHORTCUTS) {
    const path = join(desktop, name)
    if (!existsSync(path)) continue
    try {
      unlinkSync(path)
    } catch {
      // Ignore if shortcut is in use or protected.
    }
  }
}
