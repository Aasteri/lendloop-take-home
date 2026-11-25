/** Date helpers for YYYY-MM-DD loan windows. All comparisons are date-only (UTC). */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseIsoDate(value: string): Date {
  if (!isIsoDate(value)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayUtc(now = Date.now()): string {
  return toIsoDate(new Date(now));
}

export function isValidRange(startDate: string, endDate: string): boolean {
  return isIsoDate(startDate) && isIsoDate(endDate) && startDate <= endDate;
}

/** Inclusive overlap on date-only ranges. */
export function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA <= endB && startB <= endA;
}

export function daysOverdue(endDate: string, now = Date.now()): number {
  if (!isIsoDate(endDate)) return 0;
  const end = parseIsoDate(endDate).getTime();
  const today = parseIsoDate(todayUtc(now)).getTime();
  const diff = today - end;
  if (diff <= 0) return 0;
  return Math.round(diff / 86_400_000);
}

export function isOverdue(endDate: string, returnedAt: number | undefined, now = Date.now()): boolean {
  return returnedAt === undefined && daysOverdue(endDate, now) > 0;
}

export function reminderIdempotencyKey(loanId: string, onDate: string): string {
  return `reminder:${loanId}:${onDate}`;
}
