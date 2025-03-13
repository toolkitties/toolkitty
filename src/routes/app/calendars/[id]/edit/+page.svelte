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

<br />
<br />
<br />
<CalendarForm data={data.form} />
<button onclick={() => handleDelete()}>Delete</button>
