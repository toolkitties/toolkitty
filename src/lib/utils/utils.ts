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
