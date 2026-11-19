const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatUsd(amount: number): string {
  return usdFormatter.format(amount);
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateRange(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

/** Number of nights between two YYYY-MM-DD dates (at least 1). */
export function nightsBetween(from: string, to: string): number {
  return Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000));
}

/** Times arrive as "2026-11-28T08:40:00-03:00": shown as-is, in the airport's local time. */
export function splitDateTime(iso: string): { date: string; time: string } {
  const m = iso.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d:\d\d)/);
  if (!m) return { date: iso, time: '' };
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
  return { date, time: m[4] };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
