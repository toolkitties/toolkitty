<script lang="ts">
  import { goto } from "$app/navigation";
  import { spaces } from "$lib/api";
  import SpaceForm from "../../SpaceForm.svelte";
  import { toast } from "$lib/toast.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const handleDelete = async () => {
    try {
      await spaces.delete(data.form.id);
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
<SpaceForm data={data.form} activeCalendarId={data.activeCalendarId} />
<button onclick={() => handleDelete()}>Delete</button>
