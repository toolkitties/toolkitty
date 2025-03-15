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

export function debounce(
  func: (topic: Topic) => Promise<void>,
  wait: number,
): (topic: Topic) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return function (topic: Topic) {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(async () => {
      await func(topic);
    }, wait);
  };
}
