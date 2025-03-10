<script lang="ts">
  import * as AlertDialog from "$lib/components/dialog/index";
  import { events, spaces, resources } from "$lib/api";
  import { toast } from "$lib/toast.svelte";
  import { goto } from "$app/navigation";

  let {
    entity,
    type,
  }: {
    entity: CalendarEvent | Space | Resource;
    type: "event" | "space" | "resource";
  } = $props();

  let open = $state(false);

  /**
   * Delete the resource
   */
  async function deleteForSure() {
    try {
      switch (type) {
        case "event":
          await events.delete(entity.id);
          break;
        case "space":
          await spaces.delete(entity.id);
          break;
        case "resource":
          await resources.delete(entity.id);
          break;
        default:
          throw new Error("Unknown type");
      }
      toast.success(`Successfully deleted ${entity.name}`);
      // close the dialog
      open = false;
      goto(`/app/${type}s`);
    } catch (error) {
      toast.error(`Failed to delete ${entity.name}`);
      console.error(`Failed to delete ${type}`, error);
    }
  }
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger class="button">Delete</AlertDialog.Trigger>
  <AlertDialog.Portal>
    <AlertDialog.Content>
      <AlertDialog.Title
        >Are you sure you want to delete {entity.name}?</AlertDialog.Title
      >
      <AlertDialog.Description>
        {#if type === "event"}
          <p>
            You won’t be able to recover your event or any requests attached to
            it.
          </p>
        {:else if type === "space"}
          <p>
            Deleting your space will delete all events created by others using
            your space. Give them a heads up before!x
          </p>
        {:else if type === "resource"}
          <p>
            Deleting your space will delete all events created by others using
            your space. Give them a heads up before!
          </p>
        {/if}
      </AlertDialog.Description>
      <AlertDialog.Action onclick={() => deleteForSure()}
        >yes</AlertDialog.Action
      >
      <AlertDialog.Cancel>cancel</AlertDialog.Cancel>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
