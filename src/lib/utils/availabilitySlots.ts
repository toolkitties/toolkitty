import { parseDate } from "@internationalized/date";

// The selectable hours shown by AvailabilitySetter (06:00–24:00).
const formatTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const availabilityTimeSlots = Array.from({ length: 36 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return { start: formatTime(minutes), end: formatTime(minutes + 30) };
});

// Display midnight as 24:00, but store it as 00:00 on the following day.
export function slotDateTime(date: string, time: string): string {
  return time === "24:00"
    ? `${parseDate(date).add({ days: 1 })}T00:00`
    : `${date}T${time}`;
}
