/*
    Builds an array of individual dates from the 'start' and 'end' fields of a TimeSpan

    The returned array contains an array of DateValue values from the @internationalized/date
    library - this is the data type used by the bits-ui calendar component used in
    festival-calendar and resource-calendar.
*/

import { CalendarDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";

export function createDatesArray(timeSpan: TimeSpan): DateValue[] {
  console.log(timeSpan);
  const { start, end } = timeSpan;
  const startCalendarDate = convertDateToCalendarDate(start);
  const endCalendarDate = convertDateToCalendarDate(end);

  let currentDate = startCalendarDate;
  let datesArray: DateValue[] = [];

  while (currentDate.compare(endCalendarDate) <= 0) {
    datesArray.push(
      new CalendarDate(currentDate.year, currentDate.month, currentDate.day),
    );
    currentDate = currentDate.add({ days: 1 });
  }

  return datesArray;
}

function convertDateToCalendarDate(date: Date) {
  return new CalendarDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}
