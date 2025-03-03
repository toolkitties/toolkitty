<script>
  import AccessRequestDialog from "$lib/components/dialog/AccessRequestDialog.svelte";
  import * as AlertDialog from "$lib/components/dialog/index";

  let { request } = $props();

  let open = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger class="button">
    <p>Update permission for {request.name}</p>
    <AccessRequestDialog {request} bind:open />
  </AlertDialog.Trigger>
</AlertDialog.Root>
