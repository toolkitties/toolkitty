import { isSubTimeSpan } from "./utils/utils";

export class TimeSpanClass {
  start: string;
  end?: string;

  constructor(timeSpan: TimeSpan) {
    this.start = timeSpan.start;
    this.end = timeSpan.end;
  }

  startDate(): Date {
    return new Date(this.start);
  }

  endDate(): Date | undefined {
    return this.end ? new Date(this.end) : undefined;
  }

  contains(timeSpan: TimeSpanClass): boolean {
    return isSubTimeSpan(this.startDate(), this.endDate(), timeSpan);
  }

  dates(): { start: Date; end?: Date } {
    return { start: this.startDate(), end: this.endDate() };
  }
}
