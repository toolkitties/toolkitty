<script lang="ts">
  import BookingRequestDialog from "$lib/components/dialog/BookingRequestDialog.svelte";
  import * as AlertDialog from "$lib/components/dialog/index";
  import BookingRequest from "$lib/components/BookingRequest.svelte";

  let { request }: { request: BookingRequestEnriched } = $props();

  let open = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger class="w-full">
    <BookingRequest {request} />
    <BookingRequestDialog {request} bind:open />
  </AlertDialog.Trigger>
</AlertDialog.Root>
