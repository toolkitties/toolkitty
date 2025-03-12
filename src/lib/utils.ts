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

export function debounce<T extends (topic: Topic) => Promise<void>>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const context = this;

      if (timeout !== undefined) {
          clearTimeout(timeout);
      }

      timeout = setTimeout(async () => {
          await func.apply(context, args);
      }, wait);
  };
}
