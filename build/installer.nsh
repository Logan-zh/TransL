; Remove legacy TransL shortcuts when installing DEMOL (appId changed on rebrand).
!macro customInstall
  SetShellVarContext current
  Delete "$DESKTOP\TransL.lnk"
  Delete "$DESKTOP\TransL Desktop.lnk"
  RMDir /r "$SMPROGRAMS\TransL"
  SetShellVarContext all
  Delete "$DESKTOP\TransL.lnk"
  Delete "$DESKTOP\TransL Desktop.lnk"
  RMDir /r "$SMPROGRAMS\TransL"
  SetShellVarContext current
!macroend
