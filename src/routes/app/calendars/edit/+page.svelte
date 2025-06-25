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

<CalendarForm data={data.form} />
{#if data.userRole === "admin"}
  <button
    onclick={() => handleDelete()}
    class="button bg-grey-light rounded-xl justify-center button-delete w-full"
    >delete</button
  >
{/if}
