<script lang="ts">
  import BookingRequestDialog from "$lib/components/dialog/BookingRequestDialog.svelte";
  import * as AlertDialog from "$lib/components/dialog/index";

  let { request }: { request: BookingRequest } = $props();

  let open = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger class="button">
    <p>{request.id}</p>
    <span>Pending</span>
    <BookingRequestDialog {request} bind:open />
  </AlertDialog.Trigger>
</AlertDialog.Root>
