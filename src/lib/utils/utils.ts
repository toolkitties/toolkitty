import type { TimeSpanClass } from "$lib/timeSpan";

export function isSubTimeSpan(
  startDate: Date,
  endDate: Date | undefined,
  timeSpan: TimeSpanClass,
): boolean {
  if (!endDate) {
    return startDate <= timeSpan.startDate();
  }

  if (!timeSpan.endDate()) {
    return false;
  }

  return timeSpan.endDate()! <= endDate && timeSpan.startDate() >= startDate;
}
