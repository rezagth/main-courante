const SIZE_UNITS = ['B', 'Ko', 'Mo', 'Go', 'To'] as const;

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return 'N/A';
  if (bytes === 0) return '0 B';

  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1);
  const value = bytes / 1024 ** unitIndex;

  if (unitIndex === 0) return `${bytes} B`;
  if (Number.isInteger(value) || value >= 10) return `${Math.round(value)} ${SIZE_UNITS[unitIndex]}`;

  return `${value.toFixed(1)} ${SIZE_UNITS[unitIndex]}`;
}
