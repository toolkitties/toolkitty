<script lang="ts">
  import type { PageProps } from "./$types";
  import CalendarForm from "$lib/components/CalendarForm.svelte";
  import { calendars } from "$lib/api";
  import { toast } from "$lib/toast.svelte";
  import { goto } from "$app/navigation";

  let { data }: PageProps = $props();

  const handleDelete = async () => {
    try {
      await calendars.deleteCalendar(data.calendarId);
      toast.success("Space deleted!");
      goto("/app/spaces");
    } catch (error) {
      console.error("Error deleting space: ", error);
      toast.error("Error deleting space!");
    }
  };
</script>

<br />
<br />
<br />
<CalendarForm formType={"edit"} calendarId={data.calendarId} />
<button onclick={() => handleDelete()}>Delete</button>
