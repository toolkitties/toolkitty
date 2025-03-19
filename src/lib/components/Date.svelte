<script lang="ts">
  type Props = { date: string; format: "date" | "time" | "datetime" };

  const { date, format = "datetime" }: Props = $props();

  const dateConfig: Intl.DateTimeFormatOptions = {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  };

  const timeConfig: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  const weekdayConfig: Intl.DateTimeFormatOptions = {
    weekday: "long",
  };

  // Needs to be unset to use runtime's default.
  const weekdayLocale = undefined;

  // For date and times we use German locale to get consistent DD.MM.YY
  // formatting.
  const locale = "de-DE";

  let formatted;
  if (format === "date") {
    const weekdayStr = new Intl.DateTimeFormat(
      weekdayLocale,
      weekdayConfig,
    ).format(new Date(date));
    const dateStr = new Intl.DateTimeFormat(locale, dateConfig).format(
      new Date(date),
    );
    formatted = `${weekdayStr} ${dateStr}`;
  } else if (format === "time") {
    formatted = new Intl.DateTimeFormat(locale, timeConfig).format(
      new Date(date),
    );
  } else if (format === "datetime") {
    const dateStr = new Intl.DateTimeFormat(locale, dateConfig).format(
      new Date(date),
    );
    const timeStr = new Intl.DateTimeFormat(locale, timeConfig).format(
      new Date(date),
    );
    formatted = `${dateStr} ${timeStr}`;
  } else {
    throw Exception("unknown date format");
  }
</script>

<time datetime={date}>{formatted}</time>
