import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const UIA_CHECK_TIMEOUT_MS = 2500
const FOREGROUND_SETTLE_MS = 180

/** 雙擊後等待前景視窗穩定（避免與啟動 App 判斷搶時間） */
export function getForegroundSettleDelayMs(): number {
  return FOREGROUND_SETTLE_MS
}

/**
 * 以 Windows UI Automation 檢查螢幕座標是否有非空文字選取（不讀剪貼簿）。
 */
export async function hasTextSelectionAtPoint(x: number, y: number): Promise<boolean> {
  const px = Math.round(x)
  const py = Math.round(y)

  const command = [
    'Add-Type -AssemblyName UIAutomationClient;',
    'Add-Type -AssemblyName UIAutomationTypes;',
    `$p=New-Object System.Windows.Point(${px},${py});`,
    '$el=[Windows.Automation.AutomationElement]::FromPoint($p);',
    'if($null -eq $el){Write-Output no;exit 0};',
    '$ct=$el.Current.ControlType.ProgrammaticName;',
    'if($ct -match "^(Button|ListItem|Hyperlink|MenuItem|TreeItem|ToolBar|Thumb|TitleBar|CheckBox|RadioButton)Control$"){Write-Output no;exit 0};',
    'try {',
    '  $tp=$el.GetCurrentPattern([Windows.Automation.Text.TextPattern]::Pattern);',
    '  if($null -eq $tp){Write-Output no;exit 0};',
    '  $ranges=$tp.GetSelection();',
    '  if($null -eq $ranges -or $ranges.Length -eq 0){Write-Output no;exit 0};',
    '  foreach($r in $ranges){ if($r.GetText(-1).Trim().Length -gt 0){Write-Output yes;exit 0} };',
    '  Write-Output no',
    '} catch { Write-Output no }'
  ].join(' ')

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
      { timeout: UIA_CHECK_TIMEOUT_MS, windowsHide: true }
    )
    return stdout.trim().toLowerCase() === 'yes'
  } catch {
    return false
  }
}
