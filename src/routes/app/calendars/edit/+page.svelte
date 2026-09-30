<script lang="ts">
  import type { PageProps } from "./$types";
  import CalendarForm from "$lib/components/CalendarForm.svelte";
  import { calendars } from "$lib/api";
  import { toast } from "$lib/toast.svelte";
  import { goto } from "$app/navigation";

  let { data }: PageProps = $props();

  const handleDelete = async () => {
    try {
      await calendars.deleteCalendar(data.form.id);
      toast.success("Calendar deleted!");
      goto("/");
    } catch (error) {
      console.error("Error deleting calendar: ", error);
      toast.error("Error deleting calendar!");
    }
  };
</script>

<section class="text-center">
  <h2>Calendar Presets</h2>
</section>
<CalendarForm
  data={data.form}
  onDelete={data.userRole === "admin" ? handleDelete : undefined}
/>
