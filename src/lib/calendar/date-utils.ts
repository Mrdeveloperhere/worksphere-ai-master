// Local-timezone date helpers — deliberately avoid toISOString()/UTC
// methods here, since that shifts the calendar day for users west of UTC.
// Calendar cells render in local time; only the stored Date instant ends up
// in UTC (handled by the server, not here).

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// 6x7 grid covering the full weeks that overlap the given month.
export function monthGridDays(monthAnchor: Date): Date[] {
  const firstOfMonth = startOfMonth(monthAnchor);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function eventsOnDay<T extends { date: string | null }>(
  events: T[],
  day: Date,
): T[] {
  const key = dateKey(day);
  return events.filter((e) => e.date && dateKey(new Date(e.date)) === key);
}
