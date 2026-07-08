; Remove legacy TransL shortcuts and startup entries when installing DEMOL.
!macro customInstall
  SetShellVarContext current

  ; Remove legacy desktop / start menu shortcuts
  Delete "$DESKTOP\TransL.lnk"
  Delete "$DESKTOP\TransL Desktop.lnk"
  RMDir /r "$SMPROGRAMS\TransL"
  Delete "$SMSTARTUP\TransL.lnk"
  Delete "$SMSTARTUP\TransL Desktop.lnk"
  Delete "$SMSTARTUP\DEMOL.lnk"

  SetShellVarContext all
  Delete "$DESKTOP\TransL.lnk"
  Delete "$DESKTOP\TransL Desktop.lnk"
  RMDir /r "$SMPROGRAMS\TransL"

  SetShellVarContext current

  ; Remove all known legacy auto-launch registry entries (HKCU Run)
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "TransL"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "transl"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "TransL Desktop"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "DEMOL Desktop"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "demol"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Electron"

  ; Force Windows to rebuild the icon cache so the new DEMOL icon shows immediately.
  Delete "$LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache_*.db"
  Delete "$LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache.db"

  ; Notify the shell about the association change so taskbar / desktop refresh.
  System::Call 'Shell32::SHChangeNotify(l 0x8000000, l 0, i 0, i 0)'
!macroend

; Clean up DEMOL auto-launch entry and shortcuts on uninstall.
!macro customUnInstall
  SetShellVarContext current

  Delete "$SMSTARTUP\TransL.lnk"
  Delete "$SMSTARTUP\TransL Desktop.lnk"
  Delete "$SMSTARTUP\DEMOL.lnk"

  ; Remove DEMOL auto-launch registry entry
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "DEMOL"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "demol"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "DEMOL Desktop"

  ; Also clean up any leftover legacy entries just in case
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "TransL"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "transl"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "TransL Desktop"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Electron"
!macroend
