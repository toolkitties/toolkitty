import { parseDate, type DateValue } from "@internationalized/date";

// The selectable hours shown by AvailabilitySetter (06:00–24:00).
const formatTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const availabilityTimeSlots = Array.from({ length: 36 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return { start: formatTime(minutes), end: formatTime(minutes + 30) };
});

export function initialAvailabilityDate(
  rangeStart: string,
  rangeEnd?: string,
): DateValue {
  const now = new Date();
  const today = parseDate(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
  );
  const start = parseDate(rangeStart.split("T")[0]);
  const end = rangeEnd ? parseDate(rangeEnd.split("T")[0]) : undefined;

  if (today.compare(start) < 0) return start;
  if (end && today.compare(end) > 0) return end;
  return today;
}

// Display midnight as 24:00, but store it as 00:00 on the following day.
export function slotDateTime(date: string, time: string): string {
  return time === "24:00"
    ? `${parseDate(date).add({ days: 1 })}T00:00`
    : `${date}T${time}`;
}
