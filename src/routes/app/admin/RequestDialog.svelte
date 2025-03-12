<script lang="ts">
  import AccessRoleDialog from "$lib/components/dialog/AccessRoleDialog.svelte";
  import * as AlertDialog from "$lib/components/dialog/index";
  let { data }: { data: User | AccessRequest } = $props();
  let open = $state(false);
  let isAccessRequest = (data as AccessRequest).from !== undefined;
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger class="button">
    <p>
      {data.name ? data.name : "Anon"}
      {isAccessRequest ? "pending" : (data as User).role}
    </p>
    <AccessRoleDialog {data} bind:open />
  </AlertDialog.Trigger>
</AlertDialog.Root>
