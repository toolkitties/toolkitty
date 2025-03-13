<script lang="ts">
  import { toast } from "$lib/toast.svelte";
  import { tick } from "svelte";
  import AccessRoleDialog from "./dialog/AccessRoleDialog.svelte";
  import BookingRequestDialog from "./dialog/BookingRequestDialog.svelte";
  import * as AlertDialog from "$lib/components/dialog/index";

  let { toastie } = $props();
  let open = $state(false);

  /**
   * Handle dialog opening and closing.
   *
   * When it opens we want to pause dismissal of toasts.
   * When it closes we want to immediately dismiss the toast that was associated with that dialog
   */
  function handleDialogOpenChange(open: boolean, id: number) {
    toast.autoDismiss = !open;
    if (!open) {
      // wait for next tick so dialog can dismiss with a nice transition
      tick().then(() => {
        toast.dismissToast(id);
      });
    }
  }
</script>

<AlertDialog.Root
  bind:open
  onOpenChange={(open) => handleDialogOpenChange(open, toastie.id)}
>
  <AlertDialog.Trigger class="button">
    <p>{toastie.message}</p>
    {#if toastie.request.type == "access_request"}
      <AccessRoleDialog data={toastie.request.data} bind:open />
    {:else if toastie.request.type == "booking_request"}
      <BookingRequestDialog request={toastie.request.data} bind:open />
    {/if}
  </AlertDialog.Trigger>
</AlertDialog.Root>
