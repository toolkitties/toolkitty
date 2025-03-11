export function isSubTimespan(
  startDate: Date,
  endDate: Date | undefined,
  timeSpan: TimeSpan,
): boolean {
  if (endDate == undefined) {
    return timeSpan.end > startDate;
  }

  return timeSpan.end > startDate && timeSpan.start < endDate;
}
