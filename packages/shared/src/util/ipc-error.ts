/** Strip Electron IPC wrapper prefix from renderer error messages. */
export function formatIpcInvokeError(message: string): string {
  return message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}
