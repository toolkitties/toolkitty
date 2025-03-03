<script lang="ts">
  import { goto } from "$app/navigation";
  import { resources } from "$lib/api";
  import ResourceForm from "$lib/components/SpaceForm.svelte";
  import { toast } from "$lib/toast.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const handleDelete = async () => {
    try {
      await resources.delete(data.resource!.id);
      toast.success("Resource deleted!");
      goto("/app/resources");
    } catch (error) {
      console.error("Error deleting resource: ", error);
      toast.error("Error deleting resource!");
    }
  };
</script>

<br />
<br />
<br />
<ResourceForm space={data.resource} formType="edit" />
<button onclick={() => handleDelete()}>Delete</button>
