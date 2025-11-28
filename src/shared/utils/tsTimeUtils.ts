export function formatMs(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function getCurrentTimeFormatted(): string {
  return new Date().toLocaleTimeString();
}