<script lang="ts">
  import EventForm from "../../EventForm.svelte";
  import type { PageProps } from "./$types";
  import { events } from "$lib/api";
  import { toast } from "$lib/toast.svelte";
  import { goto } from "$app/navigation";
  import Delete from "$lib/components/Delete.svelte";

  let { data }: PageProps = $props();

  const handleDelete = async () => {
    try {
      await events.delete(data.form.id);
      toast.success("Event deleted!");
      goto("/app/events");
    } catch (error) {
      console.error("Error deleting event: ", error);
      toast.error("Error deleting event!");
    }
  };
</script>

<br />
<br />
<br />
<EventForm
  data={data.form}
  activeCalendarId={data.activeCalendarId!}
  spaces={data.spacesList}
  resources={data.resourcesList}
/>
<Delete entity={data.event!} type="event" />
