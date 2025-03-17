<script lang="ts">
  import BookingRequestDialog from "$lib/components/dialog/BookingRequestDialog.svelte";
  import * as AlertDialog from "$lib/components/dialog/index";

  let { request }: { request: BookingRequestEnriched } = $props();

  let open = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger class="button flex justify-between w-full text-left">
    <p>{request.resource?.name}</p>
    <span>Pending</span>
    <BookingRequestDialog {request} bind:open />
  </AlertDialog.Trigger>
</AlertDialog.Root>
