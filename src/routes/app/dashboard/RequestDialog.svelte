<script lang="ts">
  import AccessRequestDialog from "$lib/components/dialog/AccessRequestDialog.svelte";
  import BookingRequestDialog from "$lib/components/dialog/BookingRequestDialog.svelte";
  import * as AlertDialog from "$lib/components/dialog/index";

  let { request }: { request: BookingRequest } = $props();

  let open = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger class="button">
    <p>{request.id}</p>
    <BookingRequestDialog {request} bind:open />
  </AlertDialog.Trigger>
</AlertDialog.Root>
