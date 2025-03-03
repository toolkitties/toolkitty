<script lang="ts">
  import EventForm from "$lib/components/EventForm.svelte";
  import type { PageProps } from "./$types";
  import { events } from "$lib/api";
  import { toast } from "$lib/toast.svelte";
  import { goto } from "$app/navigation";

  let { data }: PageProps = $props();

  const handleDelete = async () => {
    try {
      await events.delete(data.event!.id);
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
  formType="edit"
  spaces={data.spacesList}
  resources={data.resourcesList}
  event={data.event}
/>
<button onclick={() => handleDelete()}>Delete</button>
