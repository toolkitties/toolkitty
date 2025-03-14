export function isSubTimespan(
  startDate: Date,
  endDate: Date | undefined,
  timeSpan: TimeSpan,
): boolean {
  if (!endDate) {
    return startDate <= timeSpan.start;
  }

  if (!timeSpan.end) {
    return false;
  }

  return timeSpan.end <= endDate && timeSpan.start >= startDate;
}
