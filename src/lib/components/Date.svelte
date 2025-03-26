<!-- 
 @component
 Display dates in a nice format

 Format:
 - date = Tuesday 19.09.25
 - time = 17:00
 - datetime = 19.09.25 17:00
-->

<script lang="ts">
  const {
    date,
    format = "datetime",
  }: {
    date: string;
    format?: "date" | "time" | "datetime";
  } = $props();

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

  let formatted = $derived.by(() => {
    if (format === "date") {
      const weekdayStr = new Intl.DateTimeFormat(
        weekdayLocale,
        weekdayConfig,
      ).format(new Date(date));
      const dateStr = new Intl.DateTimeFormat(locale, dateConfig).format(
        new Date(date),
      );
      return `${weekdayStr} ${dateStr}`;
    } else if (format === "time") {
      return new Intl.DateTimeFormat(locale, timeConfig).format(new Date(date));
    } else {
      const dateStr = new Intl.DateTimeFormat(locale, dateConfig).format(
        new Date(date),
      );
      const timeStr = new Intl.DateTimeFormat(locale, timeConfig).format(
        new Date(date),
      );
      return `${dateStr} ${timeStr}`;
    }
  });
</script>

<time datetime={date}>{formatted}</time>
